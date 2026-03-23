import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!adminAuth || !adminDb) {
    return NextResponse.json({ error: 'Firebase Admin not configured' }, { status: 500 });
  }

  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (err) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const data = await request.json();
    const { email, password, name, role } = data;

    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Attempt to create user in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    const now = Date.now();

    // Store user data in Firestore
    await adminDb.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      name,
      email,
      role,
      createdBy: decodedToken.uid,
      createdAt: now,
      assignedGroups: [],
      assignedWarehouses: [],
    });

    // Make custom claims for security rules if needed
    await adminAuth.setCustomUserClaims(userRecord.uid, { role });

    // Create welcome notification
    const notifRef = adminDb.collection('notifications').doc();
    await notifRef.set({
      id: notifRef.id,
      userId: userRecord.uid,
      type: 'Welcome',
      message: `Welcome to EcomHutsy, ${name}! Your account as ${role} has been created.`,
      isRead: false,
      createdAt: now,
      link: '/dashboard/chats'
    });

    return NextResponse.json({ 
      success: true, 
      user: {
        uid: userRecord.uid,
        email,
        name,
        role,
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

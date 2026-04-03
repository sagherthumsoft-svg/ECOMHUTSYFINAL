import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";

const API_BASE_URL = "http://your-nextjs-backend-url/api/attendance";

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  status: "present" | "absent" | "late" | "leave";
  checkInTime?: string;
  checkOutTime?: string;
  office?: string;
}

export default function EmployeeAttendanceView({ route }: any) {
  const { employeeId, name } = route.params;
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployeeAttendance();
  }, [employeeId]);

  const fetchEmployeeAttendance = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/report?employeeId=${employeeId}`);
      const data = await response.json();
      if (data.success) {
        setRecords(data.records);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to fetch attendance history");
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: AttendanceRecord }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.date}>{item.date}</Text>
        <Text style={[styles.statusBadge, styles[`status_${item.status}` as keyof typeof styles]]}>
          {item.status.toUpperCase()}
        </Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.textDetail}>Office: {item.office || "Head Office"}</Text>
        <Text style={styles.textDetail}>In: {item.checkInTime || "--:--"} | Out: {item.checkOutTime || "--:--"}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{name}'s Attendance</Text>
        <Text style={styles.headerSubtitle}>ID: {employeeId}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 50 }} />
      ) : records.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No attendance history found.</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  header: {
    padding: 20,
    backgroundColor: "#2563EB",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#E0E7FF",
    marginTop: 4,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 16,
  },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  date: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: "bold",
    overflow: "hidden",
  },
  status_present: {
    backgroundColor: "#D1FAE5",
    color: "#065F46",
  },
  status_absent: {
    backgroundColor: "#FEE2E2",
    color: "#991B1B",
  },
  status_late: {
    backgroundColor: "#FEF3C7",
    color: "#92400E",
  },
  status_leave: {
    backgroundColor: "#DBEAFE",
    color: "#1E40AF",
  },
  cardBody: {
    flexDirection: "column",
    gap: 4,
  },
  textDetail: {
    fontSize: 14,
    color: "#4B5563",
  },
});

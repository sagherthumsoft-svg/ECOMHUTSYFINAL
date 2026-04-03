import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";

// Assuming you have an axios instance or fetch wrapper to talk to Next.js API
// and some generic components configured in your React Native app.
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

export default function AttendanceScreen({ navigation }: any) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  // Hardcoded date for demo, in reality should use a date picker
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/report?date=${selectedDate}`);
      const data = await response.json();
      if (data.success) {
        setRecords(data.records);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to fetch attendance");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const startTime = `${selectedDate}T00:00:00+08:00`;
      const endTime = `${selectedDate}T23:59:59+08:00`;
      
      const response = await fetch(`${API_BASE_URL}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startTime, endTime }),
      });
      
      const data = await response.json();
      if (data.success) {
        Alert.alert("Success", `Synced successfully. Added: ${data.stats.added}, Updated: ${data.stats.updated}`);
        fetchAttendance(); // refresh the list
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      Alert.alert("Sync Error", error.message || "Failed to sync data");
    } finally {
      setSyncing(false);
    }
  };

  const renderItem = ({ item }: { item: AttendanceRecord }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("EmployeeAttendanceView", { employeeId: item.employeeId, name: item.employeeName })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.name}>{item.employeeName}</Text>
        <Text style={[styles.statusBadge, styles[`status_${item.status}` as keyof typeof styles]]}>
          {item.status.toUpperCase()}
        </Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.textDetail}>Office: {item.office || "Head Office"}</Text>
        <Text style={styles.textDetail}>In: {item.checkInTime || "--:--"} | Out: {item.checkOutTime || "--:--"}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Attendance Overview</Text>
        <TouchableOpacity
          style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
          onPress={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.syncButtonText}>Sync Hikvision</Text>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 50 }} />
      ) : records.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No attendance records found for {selectedDate}</Text>
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
    padding: 16,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  syncButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  syncButtonDisabled: {
    backgroundColor: "#93C5FD",
  },
  syncButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
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
  name: {
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

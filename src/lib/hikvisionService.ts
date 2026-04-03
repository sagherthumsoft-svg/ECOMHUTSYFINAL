import axios from "axios";

const HIKVISION_BASE_URL = process.env.HIKVISION_BASE_URL || "http://localhost:8080/ISAPI";
const HIKVISION_USERNAME = process.env.HIKVISION_USERNAME || "admin";
const HIKVISION_PASSWORD = process.env.HIKVISION_PASSWORD || "password";

interface HikvisionLog {
  employeeNoString: string;
  name: string;
  time: string;
  doorNo: number;
  attendanceStatus: string;
}

export const fetchHikvisionLogs = async (
  startTime: string,
  endTime: string,
  officeId?: string
): Promise<HikvisionLog[]> => {
  try {
    // Note: Hikvision ISAPI often uses Digest Auth or Basic Auth. Using basic for demonstration.
    // Ensure accurate API endpoints are customized according to your specific ISAPI device capabilities
    const response = await axios.post(
      `${HIKVISION_BASE_URL}/AccessControl/AcsEvent?format=json`,
      {
        AcsEventCond: {
          searchID: "1",
          searchResultPosition: 0,
          maxResults: 1000,
          major: 5,
          minor: 75,
          startTime: startTime, // Format: 2023-10-01T00:00:00+08:00
          endTime: endTime,
        },
      },
      {
        auth: {
          username: HIKVISION_USERNAME,
          password: HIKVISION_PASSWORD,
        },
      }
    );

    const events = response.data?.AcsEventList?.AcsEvent || [];
    
    return events.map((event: any) => ({
      employeeNoString: event.employeeNoString,
      name: event.name || "Unknown",
      time: event.time,
      doorNo: event.doorNo,
      attendanceStatus: event.attendanceStatus || "check_in",
    }));
  } catch (error: any) {
    console.error("Error fetching Hikvision logs:", error.message);
    throw new Error(error.response?.data?.subStatusCode || "Failed to fetch Hikvision logs");
  }
};

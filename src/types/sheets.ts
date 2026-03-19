export interface GoogleSheet {
  id: string;
  name: string;
  googleSheetId: string;
  createdBy: string;
  createdByName: string;
  createdAt: any;
  lastUpdatedAt: any;
  assignedUsers: string[];
  assignedGroups: string[];
  permissions: {
    canEdit: string[];
    canView: string[];
  };
  isActive: boolean;
  templateType: "Orders" | "Inventory" | "Sales" | "Custom";
}

export interface SheetLog {
  id: string;
  sheetId: string;
  action: string;
  performedBy: string;
  timestamp: any;
}

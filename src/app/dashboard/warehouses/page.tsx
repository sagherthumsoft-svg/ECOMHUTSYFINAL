"use client";

import WarehouseSidebar from "@/components/chat/WarehouseSidebar";
import WarehouseWindow from "@/components/chat/WarehouseWindow";
import { useWarehouseStore } from "@/store/warehouseStore";
import { Building2 } from "lucide-react";

export default function WarehousesPage() {
  const { activeWarehouse } = useWarehouseStore();

  return (
    <div className="flex w-full h-full bg-[#efeae2] dark:bg-[#0b141a]">
      {/* Sidebar - Warehouse List */}
      <div className={`${activeWarehouse ? "hidden md:flex" : "flex"} w-full md:w-[400px] border-r border-[#d1d7db] dark:border-[#222d34] h-full`}>
        <WarehouseSidebar />
      </div>

      {/* Main Chat Window */}
      <div className={`${activeWarehouse ? "flex" : "hidden md:flex"} flex-1 h-full`}>
        {activeWarehouse ? (
          <WarehouseWindow />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#f0f2f5] dark:bg-[#222d34]">
            {/* Empty state */}
            <div className="max-w-md text-center flex flex-col items-center">
              <div className="w-24 h-24 mb-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center border-4 border-white dark:border-zinc-800 shadow-xl">
                 <Building2 className="w-12 h-12 text-blue-600 dark:text-blue-500" />
              </div>
              <h1 className="text-3xl text-[#41525d] dark:text-[#e9edef] font-light mt-4">
                Warehouses & Logistics
              </h1>
              <p className="text-[#8696a0] mt-4 text-sm leading-6">
                Communicate directly with your supply chain staff.
                <br />
                Verify shipments, update statuses, and report incidents.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

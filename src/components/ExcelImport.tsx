import React, { useRef } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface ExcelImportProps {
  onDataParsed: (data: any[]) => void;
  isLoading: boolean;
}

export const ExcelImport: React.FC<ExcelImportProps> = ({ onDataParsed, isLoading }) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const parsedData = XLSX.utils.sheet_to_json(sheet);
      onDataParsed(parsedData);
      
      // Reset input
      if (fileRef.current) fileRef.current.value = "";
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div>
      <input
        type="file"
        accept=".xlsx, .xls"
        className="hidden"
        ref={fileRef}
        onChange={handleFileUpload}
      />
      <Button 
        variant="outline" 
        onClick={() => fileRef.current?.click()}
        disabled={isLoading}
      >
        <Upload className="w-4 h-4 mr-2" />
        Import Excel
      </Button>
    </div>
  );
};

import React from "react";
import { Description } from "./_components/Description";
import FileUpload from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";

const WerkBriefHome = () => {
  return (
    <div className="flex flex-col items-center justify-center gap-5">
      <Description />
      <div className="flex items-center align-middle justify-center gap-4">
        <FileUpload />
        <div className="flex flex-col items-center align-middle justify-center gap-5">
          <Button>Download</Button>
        </div>
      </div>
    </div>
  );
};

export default WerkBriefHome;
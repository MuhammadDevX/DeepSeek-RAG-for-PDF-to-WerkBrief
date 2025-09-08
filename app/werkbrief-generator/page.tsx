import React from "react";
import { Description } from "./_components/Description";

interface Props {
  // propName: string
}

const page: React.FC<Props> = (props) => {
  return (
    <div>
      <Description />
    </div>
  );
};

export default page;
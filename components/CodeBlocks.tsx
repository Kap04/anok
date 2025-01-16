import React from 'react';
import { CodeBlock, dracula } from "react-code-blocks";

interface CodeBlockProps {
  code: string;
  language: string;
}

const AceternityCodeBlock: React.FC<CodeBlockProps> = ({ code, language }) => {
  return (
    <div className="rounded-lg overflow-hidden">
      <CodeBlock
        text={code}
        language={language}
        showLineNumbers={true}
        theme={dracula}
      />
    </div>
  );
};

export default AceternityCodeBlock;


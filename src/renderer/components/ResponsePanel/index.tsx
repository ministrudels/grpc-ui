import React from "react";
import "./styles.css";

interface Props {
  response: unknown;
  error: string | null;
  loading: boolean;
}

export default function ResponsePanel({ response, error, loading }: Props) {
  let contentClass: string;
  let content: React.ReactNode;

  if (loading) {
    contentClass = "response-loading";
    content = "Sending…";
  } else if (error) {
    contentClass = "response-error";
    content = error;
  } else if (response !== null && response !== undefined) {
    contentClass = "response-success";
    content = JSON.stringify(response, null, 2);
  } else {
    contentClass = "response-pending";
    content = "Response will appear here";
  }

  return (
    <div className="response-panel">
      <div className="response-label">Response</div>
      <div className="response-body">
        <span className={contentClass}>{content}</span>
      </div>
    </div>
  );
}

import React from "react";
import "./styles.css";

interface Props {
  message: string;
  visible: boolean;
}

/**
 * Transient toast notification anchored to the bottom centre of the screen.
 * Visibility is controlled by the parent; fades out via CSS transition when
 * visible becomes false.
 */
export default function Snackbar({ message, visible }: Props) {
  return (
    <div className={`snackbar${visible ? "" : " hidden"}`}>
      {message}
    </div>
  );
}

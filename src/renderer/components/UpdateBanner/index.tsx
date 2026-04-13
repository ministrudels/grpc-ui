import "./styles.css";

interface Props {
  onInstall: () => void;
}

export default function UpdateBanner({ onInstall }: Props) {
  return (
    <div className="update-banner">
      <span>A new version is ready to install.</span>
      <button className="update-banner-btn" onClick={onInstall}>Restart &amp; Update</button>
    </div>
  );
}

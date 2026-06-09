import React from "react";
import { QRCodeCanvas } from "qrcode.react";

interface QRCodeComponentProps {
  value: string; // Los datos que quieres mostrar en el QR
  size?: number; // Tamaño opcional
}

const QRCodeComponent: React.FC<QRCodeComponentProps> = ({ value, size = 256 }) => {
  return (
    <div>
      <QRCodeCanvas value={value} size={size} />
    </div>
  );
};

export default QRCodeComponent;

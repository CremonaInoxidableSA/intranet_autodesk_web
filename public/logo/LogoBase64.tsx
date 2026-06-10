"use client";

import Image from "next/image";

import logoDataURL from "./cremonabase64";

interface LogoProps {
  width?: number;
  height?: number;
  alt?: string;
  className?: string;
}

const LogoBase64 = ({
  width = 800,
  height = 300,
  alt = "Logo",
  className = "",
}: LogoProps) => {
  return (
    <div className={className} style={{ position: "relative", width, height }}>
      <Image
        fill
        priority
        alt={alt}
        src={logoDataURL}
        style={{ objectFit: "contain" }}
      />
    </div>
  );
};

export default LogoBase64;

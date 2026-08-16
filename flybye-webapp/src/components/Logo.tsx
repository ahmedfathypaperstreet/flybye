interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { plane: 18, text: "text-lg", gap: "gap-1.5" },
  md: { plane: 22, text: "text-xl", gap: "gap-2" },
  lg: { plane: 28, text: "text-2xl", gap: "gap-2.5" },
};

const Logo = ({ size = "md", showText = true, className = "" }: LogoProps) => {
  const s = sizes[size];
  return (
    <span className={`inline-flex items-center ${s.gap} ${className}`}>
      {/* Minimal tilted plane silhouette */}
      <svg
        width={s.plane}
        height={s.plane}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <path
          d="M28 4L14 18M28 4L19 28L14 18M28 4L4 13L14 18"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
        />
      </svg>
      {showText && (
        <span className={`font-display font-bold ${s.text} tracking-wide uppercase`}>
          Fly<span className="text-primary">Bye</span>
        </span>
      )}
    </span>
  );
};

export default Logo;

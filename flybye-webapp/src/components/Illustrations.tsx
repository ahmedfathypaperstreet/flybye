import { motion } from "framer-motion";

/**
 * Flat geometric silhouette illustrations inspired by
 * the Catch Me If You Can (2002) title sequence by Kuntzel+Deygas.
 * Bold shapes, limited palette, mid-century modern feel.
 */

export const AirportSilhouette = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 800 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Ground line */}
    <rect x="0" y="170" width="800" height="30" className="fill-primary/10" />
    
    {/* Control tower */}
    <rect x="80" y="90" width="18" height="80" className="fill-primary/20" />
    <rect x="65" y="75" width="48" height="20" rx="3" className="fill-primary/30" />
    <rect x="72" y="60" width="34" height="18" rx="2" className="fill-primary/25" />
    <circle cx="89" cy="55" r="4" className="fill-primary/40" />
    
    {/* Terminal building */}
    <rect x="160" y="120" width="200" height="50" rx="4" className="fill-primary/15" />
    <rect x="180" y="105" width="160" height="20" rx="3" className="fill-primary/20" />
    {/* Windows */}
    {[0,1,2,3,4,5,6,7].map(i => (
      <rect key={i} x={175 + i * 23} y="130" width="12" height="16" rx="1" className="fill-primary/30" />
    ))}
    
    {/* Jet bridge */}
    <rect x="360" y="130" width="60" height="14" rx="2" className="fill-primary/20" />
    
    {/* Plane silhouette (parked) */}
    <g transform="translate(420, 110)">
      <ellipse cx="50" cy="30" rx="48" ry="10" className="fill-muted-foreground/15" />
      <path d="M10 25 L90 25 L95 30 L85 30 L10 30 Z" className="fill-primary/25" />
      <path d="M55 10 L65 25 L45 25 Z" className="fill-primary/30" />
      <path d="M80 20 L95 10 L95 25 L85 25 Z" className="fill-primary/20" />
    </g>
    
    {/* Walking figures */}
    <g className="fill-accent/40">
      {/* Figure 1 - walking with briefcase */}
      <circle cx="560" cy="145" r="5" />
      <rect x="557" y="152" width="6" height="14" rx="2" />
      <rect x="565" y="158" width="8" height="3" rx="1" />
      
      {/* Figure 2 - with luggage */}
      <circle cx="600" cy="143" r="5.5" />
      <rect x="597" y="150" width="7" height="16" rx="2" />
      <rect x="608" y="152" width="4" height="12" rx="1" />
      <rect x="606" y="164" width="8" height="4" rx="1" />
    </g>
    
    {/* Distant buildings */}
    <rect x="660" y="130" width="30" height="40" rx="2" className="fill-primary/10" />
    <rect x="700" y="110" width="24" height="60" rx="2" className="fill-primary/8" />
    <rect x="732" y="140" width="40" height="30" rx="2" className="fill-primary/12" />
  </svg>
);

export const PlaneTakeoffScene = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Sky gradient circle (sun/moon) */}
    <circle cx="320" cy="80" r="40" className="fill-accent/15" />
    <circle cx="320" cy="80" r="28" className="fill-accent/10" />
    
    {/* Clouds */}
    <g className="fill-primary/8">
      <ellipse cx="100" cy="60" rx="40" ry="12" />
      <ellipse cx="85" cy="55" rx="25" ry="10" />
      <ellipse cx="250" cy="90" rx="35" ry="10" />
    </g>
    
    {/* Plane taking off */}
    <motion.g
      initial={{ x: -20, y: 20 }}
      animate={{ x: 0, y: 0 }}
      transition={{ duration: 3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
    >
      <path
        d="M80 140 L200 110 L210 105 L215 108 L205 115 L160 125 L170 145 L160 145 L145 130 L100 145 L105 155 L95 155 L80 140Z"
        className="fill-primary/40"
      />
    </motion.g>
    
    {/* Runway */}
    <path d="M0 260 L400 220 L400 240 L0 280Z" className="fill-primary/15" />
    {/* Runway dashes */}
    {[0,1,2,3,4,5,6].map(i => (
      <rect
        key={i}
        x={30 + i * 52}
        y={268 - i * 3}
        width="24"
        height="3"
        rx="1"
        className="fill-primary/30"
        transform={`rotate(-3 ${42 + i * 52} ${269 - i * 3})`}
      />
    ))}
    
    {/* Ground */}
    <rect x="0" y="275" width="400" height="25" className="fill-primary/8" />
    
    {/* Runway lights */}
    {[0,1,2,3,4].map(i => (
      <circle key={i} cx={60 + i * 70} cy={272 - i * 4} r="2.5" className="fill-accent/30" />
    ))}
  </svg>
);

export const CoupleAtTerminal = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 300 250" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Window frame */}
    <rect x="40" y="20" width="220" height="140" rx="6" className="fill-primary/8" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.1" />
    {/* Window panes */}
    <line x1="150" y1="20" x2="150" y2="160" className="stroke-primary/15" strokeWidth="1.5" />
    <line x1="40" y1="90" x2="260" y2="90" className="stroke-primary/15" strokeWidth="1.5" />
    
    {/* Plane visible through window */}
    <g className="fill-primary/20" transform="translate(170, 50)">
      <path d="M0 15 L50 5 L55 8 L45 12 L20 15 L25 25 L20 25 L10 18 L0 20Z" />
    </g>
    
    {/* Figure 1 - silhouette */}
    <g className="fill-primary/35">
      <circle cx="115" cy="170" r="10" />
      <path d="M105 182 Q110 178 115 180 Q120 178 125 182 L128 220 Q120 225 110 225 L102 220Z" />
    </g>
    
    {/* Figure 2 - silhouette */}
    <g className="fill-accent/35">
      <circle cx="175" cy="168" r="11" />
      <path d="M163 181 Q169 177 175 179 Q181 177 187 181 L190 220 Q182 226 168 226 L160 220Z" />
    </g>
    
    {/* Coffee cups */}
    <rect x="130" y="210" width="8" height="10" rx="1" className="fill-primary/25" />
    <rect x="155" y="210" width="8" height="10" rx="1" className="fill-accent/25" />
    
    {/* Table */}
    <rect x="120" y="218" width="55" height="3" rx="1" className="fill-muted-foreground/15" />
    <rect x="145" y="221" width="4" height="20" className="fill-muted-foreground/10" />
    
    {/* Floor */}
    <rect x="0" y="240" width="300" height="10" className="fill-primary/8" />
  </svg>
);

export const BoardingPassScene = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 360 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Boarding pass shape */}
    <g transform="rotate(-5, 180, 100)">
      <rect x="40" y="40" width="280" height="120" rx="8" className="fill-primary/10" stroke="currentColor" strokeWidth="1" strokeOpacity="0.15" />
      
      {/* Perforated line */}
      {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => (
        <rect key={i} x="250" y={48 + i * 10} width="1.5" height="6" rx="0.5" className="fill-primary/20" />
      ))}
      
      {/* Logo area */}
      <rect x="55" y="52" width="50" height="8" rx="2" className="fill-primary/30" />
      
      {/* Departure/arrival */}
      <text x="60" y="85" className="fill-primary/50" fontSize="22" fontWeight="bold" fontFamily="'Outfit', sans-serif">JFK</text>
      <text x="60" y="100" className="fill-muted-foreground/30" fontSize="8" fontFamily="'DM Sans', sans-serif">NEW YORK</text>
      
      {/* Arrow */}
      <path d="M125 82 L165 82" className="stroke-accent/40" strokeWidth="2" strokeLinecap="round" />
      <path d="M158 77 L165 82 L158 87" className="stroke-accent/40" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      
      {/* Small plane icon */}
      <path d="M140 72 L150 68 L151 70 L145 73 L148 78 L146 78 L140 72Z" className="fill-primary/30" />
      
      <text x="175" y="85" className="fill-primary/50" fontSize="22" fontWeight="bold" fontFamily="'Outfit', sans-serif">CDG</text>
      <text x="175" y="100" className="fill-muted-foreground/30" fontSize="8" fontFamily="'DM Sans', sans-serif">PARIS</text>
      
      {/* Barcode */}
      {[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(i => (
        <rect
          key={i}
          x={60 + i * 8 + (i % 3) * 2}
          y="115"
          width={i % 2 === 0 ? 3 : 5}
          height="25"
          rx="0.5"
          className="fill-primary/20"
        />
      ))}
      
      {/* Stub section */}
      <rect x="260" y="55" width="48" height="8" rx="2" className="fill-accent/25" />
      <text x="265" y="85" className="fill-primary/30" fontSize="10" fontWeight="600" fontFamily="'Outfit', sans-serif">SEAT</text>
      <text x="265" y="105" className="fill-accent/40" fontSize="18" fontWeight="bold" fontFamily="'Outfit', sans-serif">14A</text>
    </g>
    
    {/* Walking figure with phone */}
    <g className="fill-accent/30" transform="translate(310, 60)">
      <circle cx="15" cy="8" r="7" />
      <path d="M8 18 Q12 15 15 17 Q18 15 22 18 L24 55 Q18 58 12 58 L6 55Z" />
      <rect x="24" y="28" width="5" height="9" rx="1" className="fill-primary/30" />
    </g>
  </svg>
);

export const SkylineScene = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 800 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* City skyline silhouette */}
    <path
      d="M0 120 L0 90 L30 90 L30 60 L45 60 L45 70 L60 70 L60 40 L80 40 L80 55 L100 55 L100 30 L110 30 L110 25 L115 25 L115 30 L125 30 L125 50 L140 50 L140 65 L160 65 L160 45 L175 45 L175 35 L180 20 L185 35 L185 45 L200 45 L200 60 L220 60 L220 75 L250 75 L250 55 L270 55 L270 40 L285 40 L285 50 L300 50 L300 70 L320 70 L320 80 L350 80 L350 60 L365 60 L365 50 L375 50 L375 65 L400 65 L400 85 L430 85 L430 70 L450 70 L450 55 L460 55 L460 45 L470 45 L470 60 L490 60 L490 75 L520 75 L520 65 L540 65 L540 50 L555 50 L555 55 L570 55 L570 70 L600 70 L600 80 L640 80 L640 65 L660 65 L660 55 L680 55 L680 70 L710 70 L710 85 L740 85 L740 75 L770 75 L770 90 L800 90 L800 120Z"
      className="fill-primary/8"
    />
    {/* Window lights */}
    {[65, 73, 107, 117, 167, 255, 263, 358, 455, 463, 545, 665].map((x, i) => (
      <rect key={i} x={x} y={[50,58,35,35,50,60,65,55,52,55,55,60][i]} width="3" height="3" rx="0.5" className="fill-accent/20" />
    ))}
    
    {/* Flying plane */}
    <motion.g
      initial={{ x: -100 }}
      animate={{ x: 850 }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
    >
      <path d="M0 15 L25 10 L28 12 L22 14 L8 16 L10 20 L7 20 L0 15Z" className="fill-primary/30" />
      {/* Contrail */}
      <line x1="-60" y1="16" x2="0" y2="15" className="stroke-primary/10" strokeWidth="1" strokeDasharray="4 3" />
    </motion.g>
  </svg>
);

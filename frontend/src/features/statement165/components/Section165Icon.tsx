import { motion } from "motion/react"

type Section165IconProps = {
  size?: number
  compact?: boolean
}

export function Section165Icon({ size = 420, compact }: Section165IconProps) {
  const ease = [0.22, 1, 0.36, 1] as const
  const s = compact ? 50 : size

  return (
    <motion.svg
      width={s}
      height={s}
      viewBox="0 0 512 512"
      fill="none"
      role="img"
      aria-label="Section 165 compliance document icon with shield checkmark and bank badge"
      initial="hidden"
      animate="visible"
    >
      <defs>
        {/* Rounded square face */}
        <linearGradient id="s165-tile" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#123a8f" />
          <stop offset="45%" stopColor="#0b2566" />
          <stop offset="100%" stopColor="#071a4a" />
        </linearGradient>
        {/* Glowing rim */}
        <linearGradient id="s165-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4d8dff" />
          <stop offset="50%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#60a5fa" />
        </linearGradient>
        {/* Paper */}
        <linearGradient id="s165-paper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#dbe7ff" />
        </linearGradient>
        {/* Shield / badge fill */}
        <linearGradient id="s165-blue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <filter id="s165-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="14" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="s165-softShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#020617" floodOpacity="0.55" />
        </filter>
      </defs>

      {/* ===== Glowing rounded-square tile ===== */}
      <motion.g
        variants={{
          hidden: { opacity: 0, scale: 0.85 },
          visible: { opacity: 1, scale: 1, transition: { duration: 0.7, ease } },
        }}
        style={{ transformOrigin: "256px 256px" }}
      >
        {/* Pulsing outer glow */}
        <motion.rect
          x="52"
          y="52"
          width="408"
          height="408"
          rx="96"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="10"
          filter="url(#s165-glow)"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
        <rect x="52" y="52" width="408" height="408" rx="96" fill="url(#s165-tile)" />
        {/* Rim light — draws itself on entrance */}
        <motion.rect
          x="58"
          y="58"
          width="396"
          height="396"
          rx="92"
          fill="none"
          stroke="url(#s165-rim)"
          strokeWidth="5"
          variants={{
            hidden: { pathLength: 0, opacity: 0 },
            visible: { pathLength: 1, opacity: 1, transition: { duration: 1.4, ease, delay: 0.2 } },
          }}
        />
        {/* Top sheen */}
        <path
          d="M100 52h312c26 0 48 22 48 48v30c-90-26-234-26-408 0v-30c0-26 22-48 48-48Z"
          fill="#ffffff"
          opacity="0.07"
        />
        {/* Bottom light streak */}
        <motion.ellipse
          cx="256"
          cy="424"
          rx="150"
          ry="10"
          fill="#60a5fa"
          filter="url(#s165-glow)"
          animate={{ opacity: [0.35, 0.85, 0.35], rx: [140, 160, 140] }}
          transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
      </motion.g>

      {/* ===== Floating document group ===== */}
      <motion.g
        variants={{
          hidden: { opacity: 0, y: 30 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease, delay: 0.35 } },
        }}
      >
        <motion.g
          animate={{ y: [0, -7, 0] }}
          transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        >
          {/* Back sheet */}
          <rect x="158" y="128" width="188" height="256" rx="14" fill="#b9cdf5" filter="url(#s165-softShadow)" />
          {/* Front sheet with folded corner */}
          <path
            d="M170 132a14 14 0 0 1 14-14h122l52 52v204a14 14 0 0 1-14 14H184a14 14 0 0 1-14-14V132Z"
            fill="url(#s165-paper)"
            filter="url(#s165-softShadow)"
          />
          {/* Folded corner */}
          <path d="M306 118l52 52h-40a12 12 0 0 1-12-12v-40Z" fill="#c3d4f7" />

          {/* Title text */}
          <motion.text
            x="248"
            y="200"
            textAnchor="middle"
            fontFamily="Arial, Helvetica, sans-serif"
            fontWeight="800"
            fontSize="30"
            letterSpacing="1"
            fill="#1e3a8a"
            variants={{
              hidden: { opacity: 0, y: 8 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease, delay: 0.8 } },
            }}
          >
            SECTION
          </motion.text>
          <motion.text
            x="248"
            y="256"
            textAnchor="middle"
            fontFamily="Arial, Helvetica, sans-serif"
            fontWeight="900"
            fontSize="58"
            fill="#1e3a8a"
            variants={{
              hidden: { opacity: 0, scale: 0.7 },
              visible: { opacity: 1, scale: 1, transition: { duration: 0.55, ease, delay: 0.95 } },
            }}
            style={{ transformOrigin: "248px 240px" }}
          >
            165
          </motion.text>

          {/* Text lines — draw in one by one */}
          {[292, 312, 332].map((y, i) => (
            <motion.line
              key={y}
              x1="200"
              y1={y}
              x2={i === 2 ? 268 : 300}
              y2={y}
              stroke="#93b4e8"
              strokeWidth="9"
              strokeLinecap="round"
              variants={{
                hidden: { pathLength: 0, opacity: 0 },
                visible: {
                  pathLength: 1,
                  opacity: 1,
                  transition: { duration: 0.45, ease, delay: 1.15 + i * 0.15 },
                },
              }}
            />
          ))}
        </motion.g>
      </motion.g>

      {/* ===== Shield with checkmark (bottom-left) ===== */}
      <motion.g
        variants={{
          hidden: { opacity: 0, scale: 0, rotate: -12 },
          visible: {
            opacity: 1,
            scale: 1,
            rotate: 0,
            transition: { type: "spring", stiffness: 260, damping: 18, delay: 1.5 },
          },
        }}
        style={{ transformOrigin: "142px 322px" }}
      >
        <motion.g
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 0.6 }}
        >
          {/* Shield glow */}
          <motion.path
            d="M142 250l58 20v42c0 38-24 66-58 80-34-14-58-42-58-80v-42l58-20Z"
            fill="#3b82f6"
            filter="url(#s165-glow)"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          />
          <path
            d="M142 250l58 20v42c0 38-24 66-58 80-34-14-58-42-58-80v-42l58-20Z"
            fill="url(#s165-blue)"
            stroke="#bfdbfe"
            strokeWidth="7"
            filter="url(#s165-softShadow)"
          />
          {/* Checkmark draws itself */}
          <motion.path
            d="M116 328l20 20 36-40"
            fill="none"
            stroke="#eaf2ff"
            strokeWidth="13"
            strokeLinecap="round"
            strokeLinejoin="round"
            variants={{
              hidden: { pathLength: 0, opacity: 0 },
              visible: { pathLength: 1, opacity: 1, transition: { duration: 0.6, ease, delay: 1.9 } },
            }}
          />
        </motion.g>
      </motion.g>

      {/* ===== Bank badge (bottom-right) ===== */}
      <motion.g
        variants={{
          hidden: { opacity: 0, scale: 0, rotate: 12 },
          visible: {
            opacity: 1,
            scale: 1,
            rotate: 0,
            transition: { type: "spring", stiffness: 260, damping: 18, delay: 1.7 },
          },
        }}
        style={{ transformOrigin: "368px 344px" }}
      >
        <motion.g
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 1.2 }}
        >
          {/* Badge glow */}
          <motion.circle
            cx="368"
            cy="344"
            r="58"
            fill="#3b82f6"
            filter="url(#s165-glow)"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 1.3 }}
          />
          <circle
            cx="368"
            cy="344"
            r="58"
            fill="url(#s165-blue)"
            stroke="#bfdbfe"
            strokeWidth="7"
            filter="url(#s165-softShadow)"
          />
          {/* Bank building */}
          <motion.g
            fill="#eaf2ff"
            variants={{
              hidden: { opacity: 0, y: 6 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease, delay: 2.05 } },
            }}
          >
            {/* Pediment */}
            <path d="M368 312l32 16h-64l32-16Z" />
            <rect x="336" y="332" width="64" height="5" rx="2.5" />
            {/* Columns */}
            <rect x="343" y="341" width="9" height="26" rx="2" />
            <rect x="363.5" y="341" width="9" height="26" rx="2" />
            <rect x="384" y="341" width="9" height="26" rx="2" />
            {/* Base */}
            <rect x="336" y="371" width="64" height="6" rx="3" />
          </motion.g>
        </motion.g>
      </motion.g>
    </motion.svg>
  )
}

import {
  Button,
  Container,
  createStyles,
  Group,
  Text,
  Title,
  useMantineTheme,
  List,
  Box,
} from "@mantine/core";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { TbCheck, TbMask } from "react-icons/tb";
import Logo from "../components/Logo";
import Meta from "../components/Meta";
import useUser from "../hooks/user.hook";
import useConfig from "../hooks/config.hook";

const useStyles = createStyles((theme) => ({
  inner: {
    display: "flex",
    justifyContent: "space-between",
    paddingTop: `calc(${theme.spacing.md} * 4)`,
    paddingBottom: `calc(${theme.spacing.md} * 4)`,
    position: "relative",
    zIndex: 2,
  },
  content: {
    maxWidth: 700,
    marginRight: `calc(${theme.spacing.md} * 3)`,
    [theme.fn.smallerThan("md")]: {
      maxWidth: "100%",
      marginRight: 0,
    },
  },
  title: {
    color: "#00ff41",
    fontSize: 52,
    lineHeight: 1.1,
    fontWeight: 900,
    textShadow: "0 0 20px rgba(0, 255, 65, 0.5), 0 0 40px rgba(0, 255, 65, 0.3)",
    letterSpacing: 2,
    fontFamily: "monospace",
    animation: "$glitch 3s infinite",
    [theme.fn.smallerThan("xs")]: {
      fontSize: 32,
    },
  },
  subtitle: {
    color: "#ff006e",
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: 4,
    textTransform: "uppercase",
    marginTop: theme.spacing.md,
    textShadow: "0 0 10px rgba(255, 0, 110, 0.5)",
    fontFamily: "monospace",
  },
  description: {
    color: "#a0a0a0",
    marginTop: theme.spacing.lg,
    fontSize: 16,
    lineHeight: 1.6,
    fontFamily: "monospace",
    borderLeft: "3px solid #00ff41",
    paddingLeft: theme.spacing.md,
  },
  lawSection: {
    color: "#ff9900",
    marginTop: theme.spacing.xl,
    fontSize: 14,
    lineHeight: 1.5,
    fontFamily: "monospace",
    border: "1px solid rgba(255, 153, 0, 0.3)",
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    backgroundColor: "rgba(255, 153, 0, 0.05)",
  },
  serverInfo: {
    color: "#00ccff",
    marginTop: theme.spacing.md,
    fontSize: 14,
    fontFamily: "monospace",
    "& b": {
      color: "#00ff41",
    },
  },
  control: {
    backgroundColor: "#0a0a0a",
    color: "#00ff41",
    border: "2px solid #00ff41",
    fontFamily: "monospace",
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: 2,
    transition: "all 0.3s ease",
    "&:hover": {
      backgroundColor: "#00ff41",
      color: "#0a0a0a",
      boxShadow: "0 0 20px rgba(0, 255, 65, 0.6)",
      transform: "translateY(-2px)",
    },
    [theme.fn.smallerThan("xs")]: {
      flex: 1,
    },
  },
  image: {
    [theme.fn.smallerThan("md")]: {
      display: "none",
    },
  },
  scanline: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background:
      "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 65, 0.03) 2px, rgba(0, 255, 65, 0.03) 4px)",
    pointerEvents: "none",
    zIndex: 1,
    animation: "$crtFlicker 5s infinite",
  },
  gridBg: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundImage:
      "linear-gradient(rgba(0, 255, 65, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 65, 0.05) 1px, transparent 1px)",
    backgroundSize: "50px 50px",
    pointerEvents: "none",
    zIndex: 0,
  },
  japaneseWatermark: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: 0,
    opacity: 0.03,
    fontFamily: "sans-serif",
    fontSize: "1.5rem",
    color: "#00ff41",
    transform: "rotate(-45deg)",
    display: "flex",
    flexWrap: "wrap",
    gap: "2rem",
    padding: "2rem",
    overflow: "hidden",
  },
  samuraiIcon: {
    filter: "drop-shadow(0 0 20px rgba(0, 255, 65, 0.5))",
    animation: "$float 3s ease-in-out infinite",
  },
  "@keyframes float": {
    "0%, 100%": { transform: "translateY(0px)" },
    "50%": { transform: "translateY(-15px)" },
  },
  "@keyframes glitch": {
    "0%, 100%": { transform: "translate(0)" },
    "20%": { transform: "translate(-2px, 2px)" },
    "40%": { transform: "translate(-2px, -2px)" },
    "60%": { transform: "translate(2px, 2px)" },
    "80%": { transform: "translate(2px, -2px)" },
  },
  "@keyframes crtFlicker": {
    "0%, 100%": { opacity: 1 },
    "50%": { opacity: 0.98 },
    "51%": { opacity: 1 },
  },
}));

function SakuraPetal({ delay, left, size, duration }: any) {
  const style = {
    left: `${left}%`,
    animationDelay: `${delay}s`,
    fontSize: `${size}px`,
    animationDuration: `${duration}s`,
  };
  return <div className="sakura-petal" style={style}>🌸</div>;
}

export default function Home() {
  const { classes } = useStyles();
  const { refreshUser } = useUser();
  const router = useRouter();
  const config = useConfig();
  const [signupEnabled, setSignupEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    refreshUser().then((user) => {
      if (user) {
        router.replace("/upload");
      }
    });
    try {
      const allowRegistration = config.get("share.allowRegistration");
      setSignupEnabled(allowRegistration !== false);
    } catch (error) {
      setSignupEnabled(true);
    }
    setLoading(false);
  }, [config]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles: any[] = [];
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.3 + 0.1,
      });
    }
    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 255, 65, ${p.opacity})`;
        ctx.fill();
      });
      requestAnimationFrame(animate);
    }
    animate();
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (loading) return null;

  return (
    <>
      <Meta title="UCA Secure Share" />
      <div className={classes.gridBg} />
      <div className={classes.scanline} />
      <div className={classes.japaneseWatermark}>
        {Array(40).fill("セキュア共有").map((text, i) => (
          <span key={i}>{text}</span>
        ))}
      </div>
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      {[...Array(12)].map((_, i) => (
        <SakuraPetal
          key={i}
          delay={i * 0.8}
          left={Math.random() * 100}
          size={10 + Math.random() * 16}
          duration={10 + Math.random() * 15}
        />
      ))}
      <Container style={{ position: "relative", zIndex: 2 }}>
        <div className={classes.inner}>
          <div className={classes.content}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <TbMask size={32} color="#00ff41" />
              <Title className={classes.title}>
                Welcome to UCA Secure Share
              </Title>
            </div>
            <Text className={classes.subtitle}>
              Personal Encrypted File Sharing System
            </Text>
            
            <Text className={classes.description} mt="xl">
              Built for personal use – send and receive files without paywalls, subscriptions, or hidden costs. This system is crafted exclusively for private use as part of the UCA.gg infrastructure.
            </Text>

            <Text className={classes.description} mt="md">
              All files use encrypted storage, and share links are end-to-end encrypted. Every transfer is safe, secure, and private by design.
            </Text>

            <Text className={classes.serverInfo} mt="xl">
              <b>Server:</b> High-speed US-based infrastructure with enterprise-grade anti-DDoS protection. Fast, reliable transfers globally.
            </Text>

            <Text className={classes.serverInfo} mt="sm">
              <b>Access:</b> No registration required. Free, unlimited use for legal personal file sharing.
            </Text>

            <Box className={classes.lawSection} mt="xl">
              <Text weight={700} color="#ff9900" mb="sm">Compliance with German Federal Law</Text>
              <Text size="sm">
                All shares must adhere to StGB (German Criminal Code) and NetzDG. Prohibited content includes: hate speech, Nazi symbolism (Section 86a StGB), child sexual abuse material (Section 184b StGB), malware, ransomware, unauthorized copyrighted material, and violent extremist content. Illegal shares are removed immediately. Upon detection of such violations, all retained data including IP addresses, cache logs, and all records from the time the file was uploaded will be forwarded to law enforcement authorities.
              </Text>
            </Box>

            <Group mt={30}>
              <Button
                component={Link}
                href="/upload"
                radius="xs"
                size="md"
                className={classes.control}
              >
                [ Go to Upload ]
              </Button>
            </Group>

            <Text
              mt="xl"
              size="xs"
              color="dimmed"
              style={{
                fontFamily: "monospace",
                borderTop: "1px solid rgba(0, 255, 65, 0.2)",
                paddingTop: 10,
              }}
            >
              {"// "}Happy Sharing – セキュア・シェア (Secure Share) – UCA Private Infrastructure
            </Text>
          </div>
          <Group className={classes.image} align="center">
            <div className={classes.samuraiIcon}>
              <Logo width={220} height={220} />
            </div>
          </Group>
        </div>
      </Container>
      <style jsx global>{`
        body {
          background: #0a0a0a !important;
          color: #a0a0a0 !important;
          overflow-x: hidden;
        }
        .sakura-petal {
          position: fixed;
          top: -50px;
          z-index: 1;
          animation: fall linear infinite;
          opacity: 0.6;
          pointer-events: none;
        }
        @keyframes fall {
          0% {
            transform: translateY(-50px) rotate(0deg);
            opacity: 0.6;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #0a0a0a;
        }
        ::-webkit-scrollbar-thumb {
          background: #00ff41;
          border-radius: 4px;
        }
        ::selection {
          background: rgba(0, 255, 65, 0.3);
          color: #00ff41;
        }
      `}</style>
    </>
  );
}

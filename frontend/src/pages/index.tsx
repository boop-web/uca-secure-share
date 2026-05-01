import {
  Button,
  Container,
  createStyles,
  Group,
  List,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { TbCheck } from "react-icons/tb";
import Logo from "../components/Logo";
import Meta from "../components/Meta";
import useUser from "../hooks/user.hook";
import useConfig from "../hooks/config.hook";
import homepageService from "../services/homepage.service";
import { HomepageDto } from "../types/homepage.type";

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
    maxWidth: 580,
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
  listItem: {
    color: "#b0b0b0",
    fontFamily: "monospace",
    "& b": {
      color: "#00ff41",
      textShadow: "0 0 8px rgba(0, 255, 65, 0.4)",
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
  controlSecondary: {
    backgroundColor: "transparent",
    color: "#ff006e",
    border: "2px solid #ff006e",
    fontFamily: "monospace",
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: 2,
    transition: "all 0.3s ease",
    "&:hover": {
      backgroundColor: "#ff006e",
      color: "#0a0a0a",
      boxShadow: "0 0 20px rgba(255, 0, 110, 0.6)",
    },
  },
  image: {
    [theme.fn.smallerThan("md")]: {
      display: "none",
    },
  },
  highlight: {
    position: "relative",
    backgroundColor: "rgba(0, 255, 65, 0.15)",
    borderRadius: theme.radius.sm,
    padding: "4px 12px",
    border: "1px solid rgba(0, 255, 65, 0.3)",
  },
  sakuraBg: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: 0,
    overflow: "hidden",
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
  samuraiIcon: {
    filter: "drop-shadow(0 0 20px rgba(0, 255, 65, 0.5))",
    animation: "$float 3s ease-in-out infinite",
  },
  "@keyframes float": {
    "0%, 100%": { transform: "translateY(0px)" },
    "50%": { transform: "translateY(-15px)" },
  },
  glitchText: {
    animation: "$glitch 3s infinite",
    position: "relative",
    display: "inline-block",
  },
  "@keyframes glitch": {
    "0%, 100%": { transform: "translate(0)" },
    "20%": { transform: "translate(-2px, 2px)" },
    "40%": { transform: "translate(-2px, -2px)" },
    "60%": { transform: "translate(2px, 2px)" },
    "80%": { transform: "translate(2px, -2px)" },
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
  const [homeData, setHomeData] = useState<HomepageDto>({
    title: "Welcome to UCA",
    description:
      "01010100 01101000 01100101 00100000 01000110 01110101 01110100 01110101 01110010 01100101 00100000 01101001 01110011 00100000 01001110 01100101 01100001 01110010 00001010 01000101 01101110 01110100 01100101 01110010 00100000 01110100 01101000 01100101 00100000 01010011 01100001 01101101 01110101 01110010 01100001 01101001 00100000 01010011 01110100 01111001 01101100 01100101",
    bullet1Name: "Anonymous",
    bullet1Desc: "Your digital footprint vanishes like cherry blossoms in the wind",
    bullet2Name: "Encrypted",
    bullet2Desc: "AES-256 encryption with zero-knowledge architecture",
    bullet3Name: "Samurai-Grade",
    bullet3Desc: "Crafted with precision by elite code warriors",
    buttonText: "Enter_The_Matrix",
  });
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
  }, [config]);

  useEffect(() => {
    homepageService.get().then((data) => {
      if (data) setHomeData(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles: any[] = [];
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2,
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

  const getButtonHref = () => {
    return signupEnabled ? "/auth/signUp" : "/auth/signIn";
  };

  if (loading) return null;

  return (
    <>
      <Meta title="Home" />
      <div className={classes.gridBg} />
      <div className={classes.scanline} />
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
      <div
        className={classes.sakuraBg}
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(255, 0, 110, 0.1) 0%, transparent 60%)",
        }}
      />
      {[...Array(15)].map((_, i) => (
        <SakuraPetal
          key={i}
          delay={i * 0.8}
          left={Math.random() * 100}
          size={12 + Math.random() * 18}
          duration={8 + Math.random() * 12}
        />
      ))}
      <Container style={{ position: "relative", zIndex: 2 }}>
        <div className={classes.inner}>
          <div className={classes.content}>
            <div className={classes.glitchText}>
              <Title className={classes.title}>
                {homeData.title || "UCA"}
              </Title>
            </div>
            <Text className={classes.subtitle}>
              {homeData.description || "Share files securely"}
            </Text>
            <List
              mt={30}
              spacing="sm"
              size="sm"
              icon={
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background:
                      "linear-gradient(45deg, #00ff41, #ff006e)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <TbCheck size={12} color="#0a0a0a" />
                </div>
              }
            >
              <List.Item className={classes.listItem}>
                <b>{homeData.bullet1Name || "Feature 1"}</b> -{" "}
                {homeData.bullet1Desc || "Description 1"}
              </List.Item>
              <List.Item className={classes.listItem}>
                <b>{homeData.bullet2Name || "Feature 2"}</b> -{" "}
                {homeData.bullet2Desc || "Description 2"}
              </List.Item>
              <List.Item className={classes.listItem}>
                <b>{homeData.bullet3Name || "Feature 3"}</b> -{" "}
                {homeData.bullet3Desc || "Description 3"}
              </List.Item>
            </List>
            <Group mt={30}>
              <Button
                component={Link}
                href={getButtonHref()}
                radius="xs"
                size="md"
                className={classes.control}
              >
                {homeData.buttonText || "Get Started"}
              </Button>
              <Button
                component={Link}
                href="https://github.com/boop-web/pingvin-share-ucagg"
                target="_blank"
                variant="outline"
                radius="xs"
                size="md"
                className={classes.controlSecondary}
              >
                [ Source_Code ]
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
              {"// "}System initialized by{" "}
              <span style={{ color: "#ff006e" }}>UCA.gg</span>{" "}
              — Where samurai code meets digital anonymity
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
          borderRadius: 4px;
        }
        ::selection {
          background: rgba(0, 255, 65, 0.3);
          color: #00ff41;
        }
      `}</style>
    </>
  );
}

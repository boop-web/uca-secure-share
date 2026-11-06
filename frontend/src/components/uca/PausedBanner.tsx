import { Box, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import ucaService, { FULL_TEXT } from "../../services/uca.service";
import { ui } from "../../styles/mantine.style";

// the Nocturne banner while the server's disk is full: uploads pause, downloads keep working (owner, 6 Nov 2026).
// Asked once per page load (no polling).
export default function PausedBanner() {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    ucaService.status().then((s) => setText(s.disk === "full" ? s.message || FULL_TEXT : null)).catch(() => {});
  }, []);
  if (!text) return null;
  return (
    <Box role="status" sx={{ margin: "0 0 18px", padding: "12px 16px", borderRadius: 12, border: `1px solid ${ui.warn}`, background: `linear-gradient(180deg, ${ui.panel2}, ${ui.panel})`, boxShadow: "0 0 24px -12px rgba(232,194,122,.6)" }}>
      <Text size="sm" sx={{ color: ui.text }}>{text}</Text>
    </Box>
  );
}

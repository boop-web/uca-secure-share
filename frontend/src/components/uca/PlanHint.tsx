import { Anchor, Text } from "@mantine/core";
import { ui } from "../../styles/mantine.style";
import { UPGRADE_URL } from "../../services/uca.service";

// the one line someone without UCA Pro / UCA Max sees instead of the upload (owner, 6 Nov 2026)
export default function PlanHint({ text = "Send files with one link: UCA Pro" }: { text?: string }) {
  return (
    <Text align="center" sx={{ padding: "26px 16px", border: `1px solid ${ui.line}`, borderRadius: 14, background: `linear-gradient(180deg, ${ui.panel2}, ${ui.panel})`, color: ui.muted, fontSize: 15.5 }}>
      <Anchor href={UPGRADE_URL} target="_blank" rel="noopener" sx={{ color: ui.accent300, fontWeight: 500 }}>
        {text}
      </Anchor>
      <Text component="span" sx={{ color: ui.faint }}> {"·"} UCA Share is part of UCA Pro and UCA Max on ucagg.de.</Text>
    </Text>
  );
}

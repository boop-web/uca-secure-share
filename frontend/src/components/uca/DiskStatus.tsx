import { Box, Group, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import ucaService, { UcaDisk } from "../../services/uca.service";
import { ui } from "../../styles/mantine.style";

// Share's admin: the server's free disk - green (ok), amber (low: new links get smaller limits), red (full: uploads
// paused, downloads keep working). Read once when the page opens.
export default function DiskStatus() {
  const [d, setD] = useState<UcaDisk | null>(null);
  useEffect(() => {
    ucaService.disk().then(setD).catch(() => {});
  }, []);
  if (!d) return null;
  const color = d.level === "ok" ? ui.ok : d.level === "low" ? ui.warn : ui.danger;
  const free = d.freeGB == null ? "unknown" : `${d.freeGB} GB free`;
  return (
    <Box mb={20}>
      {d.level !== "ok" && (
        <Box role="alert" mb={12} sx={{ padding: "12px 16px", borderRadius: 12, border: `1px solid ${color}`, background: `linear-gradient(180deg, ${ui.panel2}, ${ui.panel})` }}>
          <Text size="sm" weight={500} sx={{ color }}>
            {d.level === "low" ? `Disk low: under ${d.lowGB} GB free` : `Disk full: under ${d.fullGB} GB free - uploads are paused`}
          </Text>
          <Text size="sm" color="dimmed">
            {d.level === "low"
              ? `New links get ${d.lowPercent}% of the plan limits until there is room again. Downloads work as usual.`
              : "Nobody can upload until there is room again; downloads of existing links keep working. Free space on the server."}
          </Text>
        </Box>
      )}
      <Group spacing={10} sx={{ padding: "12px 16px", borderRadius: 12, border: `1px solid ${ui.line}`, background: `linear-gradient(180deg, ${ui.panel2}, ${ui.panel})` }}>
        <Box sx={{ width: 10, height: 10, borderRadius: "50%", background: color, boxShadow: `0 0 10px ${color}` }} />
        <Text size="sm" weight={500}>Disk</Text>
        <Text size="sm" color="dimmed">
          {free} {"·"} low under {d.lowGB} GB, uploads paused under {d.fullGB} GB (Configuration › Plans)
        </Text>
      </Group>
    </Box>
  );
}

import { Box, Group, Progress, Text } from "@mantine/core";
import { size, UcaMe } from "../../services/uca.service";
import { ui } from "../../styles/mantine.style";

// space in live links: what is used, what this upload adds, what the plan holds; and the size per link
export default function QuotaBar({ me, adding = 0 }: { me: UcaMe; adding?: number }) {
  const total = me.limits.storageBytes;
  if (total == null) {
    return (
      <Text size="sm" sx={{ color: ui.muted }}>
        {me.planLabel}: no limits {"·"} {size(me.usedBytes)} in live links
      </Text>
    );
  }
  const used = (me.usedBytes / total) * 100;
  const add = (adding / total) * 100;
  const over = me.usedBytes + adding > total || (me.limits.perLinkBytes != null && adding > me.limits.perLinkBytes);
  return (
    <Box>
      <Group position="apart" mb={6} spacing={6}>
        <Text size="sm" weight={500}>
          {me.planLabel} {"·"} {size(me.usedBytes + adding)} of {size(total)}
        </Text>
        <Text size="xs" sx={{ color: over ? ui.danger : ui.muted }}>
          {over ? "Too much for your plan right now" : `Up to ${size(me.limits.perLinkBytes)} per link`}
          {me.disk === "low" && !over ? " (less while the server is short of space)" : ""}
        </Text>
      </Group>
      <Progress
        size="md"
        radius="xl"
        sections={[
          { value: Math.min(100, used), color: "nocturne" },
          { value: Math.min(100 - Math.min(100, used), add), color: over ? "red" : "teal" },
        ]}
      />
    </Box>
  );
}

import { createStyles, Group, Text, Title } from "@mantine/core";
import { ReactNode } from "react";
import { ui } from "../../styles/mantine.style";

const useStyles = createStyles(() => ({
  kicker: {
    color: ui.accent,
    letterSpacing: ".16em",
    textTransform: "uppercase",
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 6,
  },
}));

// Small orange kicker + heading, with optional actions on the right.
const PageTitle = ({
  kicker,
  title,
  description,
  children,
  mb = 24,
}: {
  kicker?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  mb?: number;
}) => {
  const { classes } = useStyles();
  return (
    <Group position="apart" align="flex-end" mb={mb} spacing="sm">
      <div style={{ minWidth: 0 }}>
        {kicker && <div className={classes.kicker}>{kicker}</div>}
        <Title order={2} sx={{ fontSize: 28, lineHeight: 1.15 }}>
          {title}
        </Title>
        {description && (
          <Text color="dimmed" size="sm" mt={6}>
            {description}
          </Text>
        )}
      </div>
      {children && <Group spacing="xs">{children}</Group>}
    </Group>
  );
};

export default PageTitle;

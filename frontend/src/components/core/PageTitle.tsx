import { createStyles, Group, Text, Title } from "@mantine/core";
import { ReactNode } from "react";
import { ui } from "../../styles/mantine.style";

const useStyles = createStyles(() => ({
  kicker: {
    color: ui.accent2,
    font: `500 10.5px/1 ${ui.mono}`,
    letterSpacing: ".22em",
    textTransform: "uppercase",
    marginBottom: 10,
  },
}));

// Small mono kicker (Nocturne) + heading, with optional actions on the right.
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
        <Title order={2} sx={{ fontSize: 28, lineHeight: 1.15, fontWeight: 500, letterSpacing: "-.02em" }}>
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

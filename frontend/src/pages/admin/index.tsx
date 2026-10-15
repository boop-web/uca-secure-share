import { createStyles, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import Link from "next/link";
import { TbHome, TbLink, TbSettings, TbUsers } from "react-icons/tb";
import { FormattedMessage } from "react-intl";
import Meta from "../../components/Meta";
import useTranslate from "../../hooks/useTranslate.hook";
import { ui } from "../../styles/mantine.style";

const useStyles = createStyles(() => ({
  item: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "18px 20px",
    background: ui.panel,
    border: `1px solid ${ui.line}`,
    borderRadius: 16,
    transition: "border-color .15s, transform .15s",
    "&:hover": {
      borderColor: ui.lineStrong,
      transform: "translateY(-1px)",
    },
  },
  icon: {
    width: 42,
    height: 42,
    flex: "none",
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    color: ui.accent,
    background: "rgba(255,138,61,.12)",
  },
}));

const Admin = () => {
  const { classes } = useStyles();
  const t = useTranslate();

  const managementOptions = [
    {
      title: t("admin.button.users"),
      description: "Accounts, admins and invites",
      icon: TbUsers,
      route: "/admin/users",
    },
    {
      title: t("admin.button.shares"),
      description: "All shares on this server",
      icon: TbLink,
      route: "/admin/shares",
    },
    {
      title: t("admin.button.config"),
      description: "Limits, email, sign-in, legal",
      icon: TbSettings,
      route: "/admin/config/general",
    },
    {
      title: "Home page",
      description: "Edit the start page text",
      icon: TbHome,
      route: "/admin/homepage",
    },
  ];

  return (
    <>
      <Meta title={t("admin.title")} />
      <Stack spacing={4} mb={24}>
        <Text size="xs" sx={{ color: ui.accent, letterSpacing: ".16em" }}>
          ADMIN
        </Text>
        <Title order={2}>
          <FormattedMessage id="admin.title" />
        </Title>
      </Stack>
      <SimpleGrid cols={2} spacing="md" breakpoints={[{ maxWidth: "sm", cols: 1 }]}>
        {managementOptions.map((item) => (
          <Link href={item.route} key={item.route} className={classes.item}>
            <span className={classes.icon}>
              <item.icon size={22} />
            </span>
            <span>
              <Text weight={600}>{item.title}</Text>
              <Text size="sm" color="dimmed">
                {item.description}
              </Text>
            </span>
          </Link>
        ))}
      </SimpleGrid>
      <Text size="xs" color="dimmed" align="center" mt={40}>
        <FormattedMessage id="admin.version" /> {process.env.VERSION}
      </Text>
    </>
  );
};

export default Admin;

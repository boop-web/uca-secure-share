import { createStyles, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import Link from "next/link";
import { TbHome, TbLink, TbRadar2, TbSettings, TbUsers } from "react-icons/tb";
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
    background: `linear-gradient(180deg, ${ui.panel2}, ${ui.panel})`,
    border: `1px solid ${ui.line}`,
    borderRadius: 14,
    boxShadow: "0 1px 0 rgba(255,255,255,.03) inset, 0 20px 40px -30px rgba(0,0,0,.9)",
    transition: "border-color .2s, transform .2s cubic-bezier(.2,.7,.2,1), box-shadow .3s",
    animation: "ucaRise .45s cubic-bezier(.2,.7,.2,1) both",
    "@media (prefers-reduced-motion: reduce)": { animation: "none" },
    "&:hover": {
      borderColor: ui.lineStrong,
      transform: "translateY(-2px)",
      boxShadow: "0 18px 40px -24px rgba(0,0,0,1), 0 0 0 1px rgba(var(--uca-accent-rgb, 145, 132, 217), .08)",
    },
  },
  icon: {
    width: 42,
    height: 42,
    flex: "none",
    borderRadius: 8,
    display: "grid",
    placeItems: "center",
    color: ui.accent2,
    background: ui.soft,
    border: "1px solid rgba(var(--uca-accent-rgb, 145, 132, 217), .3)",
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
    {
      title: "UCA control center",
      description: "Numbers, limits and checks on ucagg.de/admin",
      icon: TbRadar2,
      route: "https://ucagg.de/admin#app/share",
    },
  ];

  return (
    <>
      <Meta title={t("admin.title")} />
      <Stack spacing={4} mb={24}>
        <Text sx={{ color: ui.accent2, font: `500 10.5px/1 ${ui.mono}`, letterSpacing: ".22em", marginBottom: 6 }}>
          ADMIN
        </Text>
        <Title order={2} weight={500} sx={{ letterSpacing: "-.02em" }}>
          <FormattedMessage id="admin.title" />
        </Title>
      </Stack>
      <SimpleGrid cols={2} spacing="md" breakpoints={[{ maxWidth: "sm", cols: 1 }]}>
        {managementOptions.map((item, i) => (
          <Link href={item.route} key={item.route} className={classes.item} style={{ animationDelay: `${i * 50}ms` }}>
            <span className={classes.icon}>
              <item.icon size={22} />
            </span>
            <span>
              <Text weight={500}>{item.title}</Text>
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

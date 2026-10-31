import {
  Box,
  Burger,
  Container,
  createStyles,
  Group,
  Header as MantineHeader,
  Paper,
  Stack,
  Transition,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode, useEffect, useState } from "react";
import useConfig from "../../hooks/config.hook";
import useUser from "../../hooks/user.hook";
import useTranslate from "../../hooks/useTranslate.hook";
import { ui } from "../../styles/mantine.style";
import Brand from "../Brand";
import ActionAvatar from "./ActionAvatar";
import NavbarShareMenu from "./NavbarShareMenu";

const HEADER_HEIGHT = 64;

type NavLink = {
  link?: string;
  label?: string;
  component?: ReactNode;
  primary?: boolean;
};

const useStyles = createStyles((theme) => ({
  root: {
    position: "sticky",
    top: 0,
    zIndex: 50,
  },

  dropdown: {
    position: "absolute",
    top: HEADER_HEIGHT,
    left: 0,
    right: 0,
    zIndex: 0,
    borderRadius: 0,
    borderLeft: 0,
    borderRight: 0,
    overflow: "hidden",
    backgroundColor: ui.panel,

    [theme.fn.largerThan("sm")]: {
      display: "none",
    },
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    height: "100%",
  },

  links: {
    [theme.fn.smallerThan("sm")]: {
      display: "none",
    },
  },

  burger: {
    [theme.fn.largerThan("sm")]: {
      display: "none",
    },
  },

  link: {
    display: "block",
    lineHeight: 1,
    padding: "9px 12px",
    borderRadius: 8,
    color: ui.muted,
    fontSize: 14,
    fontWeight: 500,
    transition: "color .15s, background-color .2s",

    "&:hover": {
      color: ui.text,
    },

    [theme.fn.smallerThan("sm")]: {
      borderRadius: 0,
      padding: theme.spacing.md,
      fontSize: 15,
    },
  },

  linkActive: {
    "&, &:hover": {
      color: ui.text,
      backgroundColor: ui.panel2,
      boxShadow: `inset 0 -1px 0 ${ui.accent}`,
    },
  },

  // the Nocturne primary: outlined in the accent, a soft glow
  primary: {
    "&, &:hover": {
      color: ui.accent300,
      border: `1px solid ${ui.accent}`,
      boxShadow: `0 0 24px -12px ${ui.glow}`,
      padding: "9px 14px",
      fontSize: 13.5,
    },
    "&:hover": { backgroundColor: ui.accent900 },
    [theme.fn.smallerThan("sm")]: {
      "&, &:hover": {
        border: 0,
        boxShadow: "none",
        color: ui.accent2,
        padding: theme.spacing.md,
        fontSize: 15,
      },
    },
  },

  // UCA ID: the one account across UCA apps (ucagg.de/account)
  idchip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    height: 32,
    padding: "0 12px 0 8px",
    borderRadius: 999,
    border: `1px solid ${ui.line}`,
    background: ui.bgSoft,
    color: ui.accent2,
    font: `500 11px/1 ${ui.mono}`,
    letterSpacing: ".12em",
    transition: "border-color .2s, color .2s, box-shadow .3s",
    "&:hover": { borderColor: "rgba(var(--uca-accent-rgb, 145, 132, 217), .45)", color: ui.accent300, boxShadow: `0 0 20px -10px ${ui.glow}` },
    "& i": {
      width: 14,
      height: 14,
      borderRadius: "50%",
      border: `2px solid ${ui.accent}`,
      boxShadow: `0 0 10px ${ui.glow}`,
      position: "relative",
      flex: "none",
    },
    "& i::after": { content: '""', position: "absolute", inset: 3, borderRadius: "50%", background: ui.accent2 },
    [theme.fn.smallerThan("sm")]: { margin: `${theme.spacing.sm}px ${theme.spacing.md}px` },
  },
}));

const Header = () => {
  const { user } = useUser();
  const router = useRouter();
  const config = useConfig();
  const t = useTranslate();

  const { classes, cx } = useStyles();
  const [opened, toggleOpened] = useDisclosure(false);

  const [currentRoute, setCurrentRoute] = useState("");

  useEffect(() => {
    setCurrentRoute(router.pathname);
  }, [router.pathname]);

  const idChip: NavLink = {
    component: (
      <a href="https://ucagg.de/account" className={classes.idchip} title="UCA ID - one account for every UCA app" rel="noopener">
        <i aria-hidden="true" />
        UCA ID
      </a>
    ),
  };

  const authenticatedLinks: NavLink[] = [
    {
      link: "/upload",
      label: t("navbar.upload"),
    },
    {
      component: <NavbarShareMenu />,
    },
    idChip,
    {
      component: <ActionAvatar />,
    },
  ];

  let unauthenticatedLinks: NavLink[] = [
    {
      link: "/auth/signIn",
      label: t("navbar.signin"),
    },
  ];

  if (config.get("share.allowUnauthenticatedShares")) {
    unauthenticatedLinks.unshift({
      link: "/upload",
      label: t("navbar.upload"),
    });
  }

  unauthenticatedLinks.push(idChip);

  if (config.get("share.allowRegistration"))
    unauthenticatedLinks.push({
      link: "/auth/signUp",
      label: t("navbar.signup"),
      primary: true,
    });

  const items = (
    <>
      {(user ? authenticatedLinks : unauthenticatedLinks).map((link, i) => {
        if (link.component) {
          return (
            <Box px={4} py={12} key={i} sx={{ display: "flex", alignItems: "center" }}>
              {link.component}
            </Box>
          );
        }
        return (
          <Link
            key={link.label}
            href={link.link ?? ""}
            onClick={() => toggleOpened.close()}
            className={cx(classes.link, {
              [classes.linkActive]: currentRoute == link.link && !link.primary,
              [classes.primary]: link.primary,
            })}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
  return (
    <MantineHeader height={HEADER_HEIGHT} mb={32} className={classes.root}>
      <Container size={1040} px="md" className={classes.header}>
        <Brand />
        <Group spacing={6} className={classes.links}>
          {items}
        </Group>
        <Burger
          opened={opened}
          onClick={() => toggleOpened.toggle()}
          className={classes.burger}
          size="sm"
          color={ui.muted}
          aria-label="Menu"
        />
        <Transition transition="pop-top-right" duration={200} mounted={opened}>
          {(styles) => (
            <Paper className={classes.dropdown} withBorder style={styles}>
              <Stack spacing={0}>{items}</Stack>
            </Paper>
          )}
        </Transition>
      </Container>
    </MantineHeader>
  );
};

export default Header;

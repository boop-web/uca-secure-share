import { ActionIcon, Avatar, Menu } from "@mantine/core";
import Link from "next/link";
import { TbDoorExit, TbExternalLink, TbSettings, TbUser } from "react-icons/tb";
import { ui } from "../../styles/mantine.style";
import useUser from "../../hooks/user.hook";
import authService from "../../services/auth.service";
import { FormattedMessage, useIntl } from "react-intl";

const ActionAvatar = () => {
  const { user } = useUser();

  return (
    <Menu position="bottom-start" withinPortal>
      <Menu.Target>
        <ActionIcon size={36} radius="xl" aria-label="Account menu">
          <Avatar
            size={34}
            radius="xl"
            styles={{
              placeholder: {
                background: ui.soft,
                color: ui.accent2,
                border: "1px solid rgba(145,132,217,.3)",
                fontWeight: 600,
                fontSize: 13,
              },
            }}
          >
            {(user?.username || "?").slice(0, 1).toUpperCase()}
          </Avatar>
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item component={Link} href="/account" icon={<TbUser size={14} />}>
          <FormattedMessage id="navbar.avatar.account" />
        </Menu.Item>
        {user!.isAdmin && (
          <Menu.Item
            component={Link}
            href="/admin"
            icon={<TbSettings size={14} />}
          >
            <FormattedMessage id="navbar.avatar.admin" />
          </Menu.Item>
        )}

        <Menu.Item
          component="a"
          href="https://ucagg.de/account"
          icon={<TbExternalLink size={14} />}
        >
          UCA ID
        </Menu.Item>
        <Menu.Item
          onClick={async () => {
            await authService.signOut();
          }}
          icon={<TbDoorExit size={14} />}
        >
          <FormattedMessage id="navbar.avatar.signout" />
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

export default ActionAvatar;

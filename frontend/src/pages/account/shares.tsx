import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Space,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import { useModals } from "@mantine/modals";
import moment from "moment";
import Link from "next/link";
import { useEffect, useState } from "react";
import { TbEdit, TbInfoCircle, TbLink, TbLock, TbTrash } from "react-icons/tb";
import { FormattedMessage } from "react-intl";
import Meta from "../../components/Meta";
import showShareInformationsModal from "../../components/account/showShareInformationsModal";
import showShareLinkModal from "../../components/account/showShareLinkModal";
import CenterLoader from "../../components/core/CenterLoader";
import useConfig from "../../hooks/config.hook";
import useTranslate from "../../hooks/useTranslate.hook";
import shareService from "../../services/share.service";
import { MyShare } from "../../types/share.type";
import toast from "../../utils/toast.util";
import QuotaBar from "../../components/uca/QuotaBar";
import ucaService, { UcaMe } from "../../services/uca.service";

// "Download 2, today 14:32, Android phone · Chrome"
const when = (at: string) => {
  const m = moment(at);
  return m.isSame(moment(), "day") ? `today ${m.format("HH:mm")}` : m.isSame(moment().subtract(1, "day"), "day") ? `yesterday ${m.format("HH:mm")}` : m.format("D MMM HH:mm");
};
const showDownloads = (modals: ReturnType<typeof useModals>, share: MyShare) =>
  modals.openModal({
    title: `Downloads of ${share.name || share.id}`,
    children: (
      <Stack spacing={6}>
        {(share.downloadLog || []).length === 0 ? (
          <Text size="sm" color="dimmed">No downloads yet.</Text>
        ) : (
          (share.downloadLog || []).map((d) => (
            <Text size="sm" key={d.n}>
              Download {d.n}, {when(d.at)}, {d.device}
            </Text>
          ))
        )}
        <Text size="xs" color="dimmed" mt={8}>Only the number, the time and the device type are kept - no IP address, no location.</Text>
      </Stack>
    ),
  });

const MyShares = () => {
  const modals = useModals();
  const clipboard = useClipboard();
  const config = useConfig();
  const t = useTranslate();

  const [shares, setShares] = useState<MyShare[]>();
  const [me, setMe] = useState<UcaMe | null>(null);

  useEffect(() => {
    shareService.getMyShares().then((shares) => setShares(shares));
    ucaService.me().then(setMe).catch(() => setMe(null));
  }, []);

  if (!shares) return <CenterLoader />;

  return (
    <>
      <Meta title={t("account.shares.title")} />
      <Title mb={16} order={3}>
        <FormattedMessage id="account.shares.title" />
      </Title>
      {me && me.canSend && (
        <Box mb={24}>
          <QuotaBar me={me} />
        </Box>
      )}
      {shares.length == 0 ? (
        <Center style={{ height: "70vh" }}>
          <Stack align="center" spacing={10}>
            <Title order={3}>
              <FormattedMessage id="account.shares.title.empty" />
            </Title>
            <Text>
              <FormattedMessage id="account.shares.description.empty" />
            </Text>
            <Space h={5} />
            <Button component={Link} href="/upload" variant="light">
              <FormattedMessage id="account.shares.button.create" />
            </Button>
          </Stack>
        </Center>
      ) : (
        <Box sx={{ display: "block", overflowX: "auto" }}>
          <Table>
            <thead>
              <tr>
                <th>
                  <FormattedMessage id="account.shares.table.id" />
                </th>
                <th>
                  <FormattedMessage id="account.shares.table.name" />
                </th>
                <th>Downloads</th>
                <th>
                  <FormattedMessage id="account.shares.table.expiresAt" />
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shares.map((share) => (
                <tr key={share.id}>
                  <td>
                    <Group spacing="xs">
                      {share.id}{" "}
                      {share.security.passwordProtected && (
                        <TbLock
                          color="orange"
                          title={t("account.shares.table.password-protected")}
                        />
                      )}
                    </Group>
                  </td>
                  <td>{share.name}</td>
                  <td>
                    <Group spacing={6} noWrap>
                      <Badge
                        variant="outline"
                        color={share.endedAt ? "gray" : "nocturne"}
                        sx={{ cursor: "pointer", textTransform: "none" }}
                        onClick={() => showDownloads(modals, share)}
                        title="Show every download"
                      >
                        {share.mode === "downloads" && share.maxDownloads
                          ? `${share.downloads ?? 0} of ${share.maxDownloads}`
                          : `${share.downloads ?? 0}`}
                      </Badge>
                      {share.endedAt && <Text size="xs" color="dimmed">ended</Text>}
                    </Group>
                  </td>
                  <td>
                    {moment(share.expiration).unix() === 0 ? (
                      <FormattedMessage id="account.shares.table.expiry-never" />
                    ) : (
                      moment(share.expiration).format("LLL")
                    )}
                  </td>
                  <td>
                    <Group position="right">
                      <Link href={`/share/${share.id}/edit`}>
                        <ActionIcon color="orange" variant="light" size={25}>
                          <TbEdit />
                        </ActionIcon>
                      </Link>
                      <ActionIcon
                        color="blue"
                        variant="light"
                        size={25}
                        onClick={() => {
                          showShareInformationsModal(
                            modals,
                            share,
                            parseInt(config.get("share.maxSize")),
                          );
                        }}
                      >
                        <TbInfoCircle />
                      </ActionIcon>
                      <ActionIcon
                        color="nocturne"
                        variant="light"
                        size={25}
                        onClick={() => {
                          if (window.isSecureContext) {
                            clipboard.copy(
                              `${window.location.origin}/s/${share.id}`,
                            );
                            toast.success(t("common.notify.copied-link"));
                          } else {
                            showShareLinkModal(modals, share.id);
                          }
                        }}
                      >
                        <TbLink />
                      </ActionIcon>
                      <ActionIcon
                        color="red"
                        variant="light"
                        size={25}
                        onClick={() => {
                          modals.openConfirmModal({
                            title: t("account.shares.modal.delete.title", {
                              share: share.id,
                            }),
                            children: (
                              <Text size="sm">
                                <FormattedMessage id="account.shares.modal.delete.description" />
                              </Text>
                            ),
                            confirmProps: {
                              color: "red",
                            },
                            labels: {
                              confirm: t("common.button.delete"),
                              cancel: t("common.button.cancel"),
                            },
                            onConfirm: () => {
                              shareService
                                .remove(share.id)
                                .then(() => ucaService.me().then(setMe))
                                .catch(() => {});
                              setShares(
                                shares.filter((item) => item.id !== share.id),
                              );
                            },
                          });
                        }}
                      >
                        <TbTrash />
                      </ActionIcon>
                    </Group>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Box>
      )}
    </>
  );
};

export default MyShares;

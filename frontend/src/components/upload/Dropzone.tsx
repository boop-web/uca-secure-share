import { Button, Center, createStyles, Group, keyframes, Text } from "@mantine/core";
import { ui } from "../../styles/mantine.style";

// the cloud floats and its glow breathes (transform + opacity only: cheap)
const float = keyframes({ "0%, 100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } });
const breathe = keyframes({ "0%, 100%": { opacity: 0.35, transform: "scale(.9)" }, "50%": { opacity: 0.8, transform: "scale(1.08)" } });
import { Dropzone as MantineDropzone } from "@mantine/dropzone";
import { ForwardedRef, useRef } from "react";
import { TbCloudUpload, TbUpload } from "react-icons/tb";
import { FormattedMessage } from "react-intl";
import useTranslate from "../../hooks/useTranslate.hook";
import { FileUpload } from "../../types/File.type";
import { size as byteToHumanSizeString } from "../../services/uca.service";
import toast from "../../utils/toast.util";

const useStyles = createStyles((theme) => ({
  wrapper: {
    position: "relative",
    marginBottom: 30,
  },

  dropzone: {
    borderRadius: 14,
    transition: "background-color .2s, border-color .2s, box-shadow .3s",
    "&[data-accept]": { boxShadow: `0 0 40px -12px ${ui.glow}` },
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(var(--uca-accent-rgb, 145, 132, 217), .45)",
    backgroundColor: ui.panel,
    paddingTop: 36,
    paddingBottom: 56,
    "&:hover, &[data-accept]": {
      backgroundColor: "rgba(var(--uca-accent-rgb, 145, 132, 217), .06)",
      borderColor: ui.accent,
    },
  },

  icon: {
    color: ui.accent2,
    animation: `${float} 3.2s ease-in-out infinite`,
    "@media (prefers-reduced-motion: reduce)": { animation: "none" },
  },
  iconWrap: {
    position: "relative",
    "&::before": {
      content: '""',
      position: "absolute",
      inset: -14,
      borderRadius: "50%",
      background: `radial-gradient(circle, ${ui.glow}, transparent 70%)`,
      animation: `${breathe} 3.2s ease-in-out infinite`,
      "@media (prefers-reduced-motion: reduce)": { animation: "none" },
    },
  },

  control: {
    position: "absolute",
    bottom: -20,
    backgroundColor: `${ui.bg} !important`,
    "&:hover": { backgroundColor: `${ui.accent900} !important` },
  },
}));

const Dropzone = ({
  title,
  isUploading,
  maxShareSize,
  onFilesChanged,
}: {
  title?: string;
  isUploading: boolean;
  maxShareSize: number;
  onFilesChanged: (files: FileUpload[]) => void;
}) => {
  const t = useTranslate();

  const { classes } = useStyles();
  const openRef = useRef<() => void>();
  return (
    <div className={classes.wrapper}>
      <MantineDropzone
        onReject={(e) => {
          toast.error(e[0].errors[0].message);
        }}
        disabled={isUploading}
        openRef={openRef as ForwardedRef<() => void>}
        onDrop={(files: FileUpload[]) => {
          const fileSizeSum = files.reduce((n, { size }) => n + size, 0);

          if (fileSizeSum > maxShareSize) {
            toast.error(
              t("upload.dropzone.notify.file-too-big", {
                maxSize: byteToHumanSizeString(maxShareSize),
              }),
            );
          } else {
            files = files.map((newFile) => {
              newFile.uploadingProgress = 0;
              return newFile;
            });
            onFilesChanged(files);
          }
        }}
        className={classes.dropzone}
        radius="lg"
      >
        <div style={{ pointerEvents: "none" }}>
          <Group position="center">
            <div className={classes.iconWrap}>
              <TbCloudUpload size={46} className={classes.icon} style={{ position: "relative" }} />
            </div>
          </Group>
          <Text align="center" weight={500} size="lg" mt="xl">
            {title || <FormattedMessage id="upload.dropzone.title" />}
          </Text>
          <Text align="center" size="sm" mt="xs" color="dimmed">
            <FormattedMessage
              id="upload.dropzone.description"
              values={{ maxSize: byteToHumanSizeString(maxShareSize) }}
            />
          </Text>
        </div>
      </MantineDropzone>
      <Center>
        <Button
          className={classes.control}
          variant="filled"
          size="sm"
          radius="xl"
          aria-label="Choose files"
          disabled={isUploading}
          onClick={() => openRef.current && openRef.current()}
        >
          {<TbUpload />}
        </Button>
      </Center>
    </div>
  );
};
export default Dropzone;

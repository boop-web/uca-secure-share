import {
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import Link from "next/link";
import { useEffect, useState } from "react";
import Meta from "../../components/Meta";
import homepageService from "../../services/homepage.service";
import { HomepageDto } from "../../types/homepage.type";
import { ui } from "../../styles/mantine.style";
import {
  HOMEPAGE_DEFAULTS,
  pickHomepageFields,
  resolveHomepage,
} from "../../utils/homepage.util";
import toast from "../../utils/toast.util";

type Field = keyof HomepageDto;

const AdminHomepage = () => {
  const [homeData, setHomeData] =
    useState<Required<HomepageDto>>(HOMEPAGE_DEFAULTS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    homepageService
      .get()
      .then((data) => setHomeData(resolveHomepage(data)))
      .catch(toast.axiosError);
  }, []);

  const set = (key: Field) => (e: { currentTarget: { value: string } }) =>
    setHomeData({ ...homeData, [key]: e.currentTarget.value });

  const handleSave = async () => {
    setLoading(true);
    await homepageService
      .update(pickHomepageFields(homeData))
      .then(() => toast.success("Home page saved."))
      .catch(toast.axiosError);
    setLoading(false);
  };

  const feature = (n: 1 | 2 | 3) => (
    <Paper withBorder p="lg" key={n}>
      <Text size="xs" mb="sm" sx={{ color: ui.accent, letterSpacing: ".12em" }}>
        FEATURE CARD {n}
      </Text>
      <Stack spacing="sm">
        <TextInput
          label="Heading"
          value={homeData[`bullet${n}Name`]}
          onChange={set(`bullet${n}Name`)}
        />
        <Textarea
          label="Text"
          value={homeData[`bullet${n}Desc`]}
          onChange={set(`bullet${n}Desc`)}
          autosize
          minRows={3}
        />
      </Stack>
    </Paper>
  );

  return (
    <>
      <Meta title="Home page" />
      <Stack spacing="lg" pb="xl">
        <Group position="apart" align="flex-end">
          <div>
            <Text size="xs" sx={{ color: ui.accent, letterSpacing: ".16em" }}>
              ADMIN
            </Text>
            <Title order={2}>Home page</Title>
            <Text color="dimmed" size="sm">
              The text visitors see on the start page. Leave a feature heading
              empty to hide that card.
            </Text>
          </div>
          <Group spacing="xs">
            <Button variant="default" component={Link} href="/admin">
              Back
            </Button>
            <Button variant="default" component={Link} href="/" target="_blank">
              Preview
            </Button>
          </Group>
        </Group>

        <Paper withBorder p="lg">
          <Stack spacing="sm">
            <Textarea
              label="Heading"
              description="Put the second part on a new line to show it in orange."
              value={homeData.title}
              onChange={set("title")}
              autosize
              minRows={2}
            />
            <Textarea
              label="Lead text"
              value={homeData.description}
              onChange={set("description")}
              autosize
              minRows={2}
            />
            <TextInput
              label="Upload button label"
              value={homeData.buttonText}
              onChange={set("buttonText")}
            />
          </Stack>
        </Paper>

        <SimpleGrid cols={3} breakpoints={[{ maxWidth: "md", cols: 1 }]}>
          {feature(1)}
          {feature(2)}
          {feature(3)}
        </SimpleGrid>

        <Group position="right">
          <Button
            variant="default"
            onClick={() => setHomeData(HOMEPAGE_DEFAULTS)}
          >
            Reset to default text
          </Button>
          <Button onClick={handleSave} loading={loading}>
            Save
          </Button>
        </Group>
      </Stack>
    </>
  );
};

export default AdminHomepage;

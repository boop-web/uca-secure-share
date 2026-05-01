import {
  Container,
  TextInput,
  Textarea,
  Button,
  Stack,
  Title,
  Group,
  Alert,
} from "@mantine/core";
import { useEffect, useState } from "react";
import Meta from "../../components/Meta";
import homepageService from "../../services/homepage.service";
import { HomepageDto } from "../../types/homepage.type";
import { TbCheck } from "react-icons/tb";
import { useRouter } from "next/router";

const AdminHomepage = () => {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [homeData, setHomeData] = useState<HomepageDto>({
    title: "",
    description: "",
    bullet1Name: "",
    bullet1Desc: "",
    bullet2Name: "",
    bullet2Desc: "",
    bullet3Name: "",
    bullet3Desc: "",
    buttonText: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    homepageService.get().then((data) => {
      if (data) setHomeData(data);
    });
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await homepageService.update(homeData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Failed to save:", error);
    }
    setLoading(false);
  };

  const inputStyle = {
    backgroundColor: "#0a0a0a",
    border: "1px solid #00ff41",
    color: "#00ff41",
    fontFamily: "monospace",
    "&:focus": {
      borderColor: "#ff006e",
    },
  };

  return (
    <>
      <Meta title="Admin - Home Page Editor" />
      <Container size="sm" style={{ position: "relative", zIndex: 2 }}>
        <Stack spacing="lg" py="xl">
          <Group position="apart">
            <Title
              order={2}
              style={{
                color: "#00ff41",
                fontFamily: "monospace",
                textShadow: "0 0 10px rgba(0, 255, 65, 0.5)",
              }}
            >
              &gt;_ Edit_Home_Page
            </Title>
            <Button
              variant="subtle"
              color="dimmed"
              onClick={() => router.push("/admin/config/general")}
              style={{ fontFamily: "monospace" }}
            >
              [ Back ]
            </Button>
          </Group>

          {saved && (
            <Alert
              icon={<TbCheck size={16} />}
              title="Saved!"
              color="green"
              variant="outline"
              style={{ borderColor: "#00ff41" }}
            >
              Home page updated successfully.
            </Alert>
          )}

          <Stack spacing="md">
            <TextInput
              label="Title"
              value={homeData.title || ""}
              onChange={(e) =>
                setHomeData({ ...homeData, title: e.target.value })
              }
              styles={{ input: inputStyle, label: { color: "#ff006e" } }}
            />
            <Textarea
              label="Description (binary/subtitle)"
              value={homeData.description || ""}
              onChange={(e) =>
                setHomeData({ ...homeData, description: e.target.value })
              }
              minRows={3}
              styles={{ input: inputStyle, label: { color: "#ff006e" } }}
            />
            <Title
              order={4}
              style={{ color: "#ff006e", fontFamily: "monospace" }}
            >
              # Feature_1
            </Title>
            <TextInput
              label="Feature 1 Name"
              value={homeData.bullet1Name || ""}
              onChange={(e) =>
                setHomeData({ ...homeData, bullet1Name: e.target.value })
              }
              styles={{ input: inputStyle, label: { color: "#00ff41" } }}
            />
            <Textarea
              label="Feature 1 Description"
              value={homeData.bullet1Desc || ""}
              onChange={(e) =>
                setHomeData({ ...homeData, bullet1Desc: e.target.value })
              }
              minRows={2}
              styles={{ input: inputStyle, label: { color: "#00ff41" } }}
            />
            <Title
              order={4}
              style={{ color: "#ff006e", fontFamily: "monospace" }}
            >
              # Feature_2
            </Title>
            <TextInput
              label="Feature 2 Name"
              value={homeData.bullet2Name || ""}
              onChange={(e) =>
                setHomeData({ ...homeData, bullet2Name: e.target.value })
              }
              styles={{ input: inputStyle, label: { color: "#00ff41" } }}
            />
            <Textarea
              label="Feature 2 Description"
              value={homeData.bullet2Desc || ""}
              onChange={(e) =>
                setHomeData({ ...homeData, bullet2Desc: e.target.value })
              }
              minRows={2}
              styles={{ input: inputStyle, label: { color: "#00ff41" } }}
            />
            <Title
              order={4}
              style={{ color: "#ff006e", fontFamily: "monospace" }}
            >
              # Feature_3
            </Title>
            <TextInput
              label="Feature 3 Name"
              value={homeData.bullet3Name || ""}
              onChange={(e) =>
                setHomeData({ ...homeData, bullet3Name: e.target.value })
              }
              styles={{ input: inputStyle, label: { color: "#00ff41" } }}
            />
            <Textarea
              label="Feature 3 Description"
              value={homeData.bullet3Desc || ""}
              onChange={(e) =>
                setHomeData({ ...homeData, bullet3Desc: e.target.value })
              }
              minRows={2}
              styles={{ input: inputStyle, label: { color: "#00ff41" } }}
            />
            <TextInput
              label="Button Text"
              value={homeData.buttonText || ""}
              onChange={(e) =>
                setHomeData({ ...homeData, buttonText: e.target.value })
              }
              styles={{ input: inputStyle, label: { color: "#ff006e" } }}
            />
          </Stack>

          <Group position="right">
            <Button
              onClick={handleSave}
              loading={loading}
              style={{
                backgroundColor: "#0a0a0a",
                color: "#00ff41",
                border: "2px solid #00ff41",
                fontFamily: "monospace",
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: 2,
              }}
            >
              [ SAVE_CHANGES ]
            </Button>
          </Group>
        </Stack>
      </Container>
    </>
  );
};

export default AdminHomepage;

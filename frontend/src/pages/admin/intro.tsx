import { Button, Center, Container, Stack, Text, Title } from "@mantine/core";
import Link from "next/link";
import Logo from "../../components/Logo";
import Meta from "../../components/Meta";
import { ui } from "../../styles/mantine.style";

const Intro = () => {
  return (
    <>
      <Meta title="Welcome" />
      <Container size="xs" py="xl">
        <Stack align="center" spacing="md">
          <Logo height={72} width={72} />
          <Text size="xs" sx={{ color: ui.accent, letterSpacing: ".16em" }}>
            SETUP
          </Text>
          <Title order={2} align="center">
            Your admin account is ready
          </Title>
          <Text color="dimmed" align="center">
            Set the limits, email and sign-in options next, or look around
            first.
          </Text>
          <Center mt="md">
            <Stack spacing="sm" w={260}>
              <Button href="/admin/config/general" component={Link}>
                Open configuration
              </Button>
              <Button href="/" component={Link} variant="default">
                Go to the home page
              </Button>
            </Stack>
          </Center>
        </Stack>
      </Container>
    </>
  );
};

export default Intro;

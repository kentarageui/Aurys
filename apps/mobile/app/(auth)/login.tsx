import { useForm } from "@tanstack/react-form";
import axios from "axios";
import { formatISO } from "date-fns/formatISO";
import { useLocalSearchParams } from "expo-router";
import EyeIcon from "lucide-react-native/dist/esm/icons/eye.mjs";
import EyeOffIcon from "lucide-react-native/dist/esm/icons/eye-off.mjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Uniwind } from "uniwind";
import Logo from "@/assets/images/logo.svg";
import CertificateTrustDialog from "@/components/auth/CertificateTrustDialog";
import FadeOutScaleDown from "@/components/FadeOutScaleDown";
import FieldError, {
  handleFieldBlur,
  showFieldError,
} from "@/components/forms/FieldError";
import UrlInputField from "@/components/forms/UrlInputField";
import LoginBackground from "@/components/LoginBackground";
import { Box } from "@/components/ui/box";
import { Center } from "@/components/ui/center";
import {
  Checkbox,
  CheckboxIcon,
  CheckboxIndicator,
  CheckboxLabel,
} from "@/components/ui/checkbox";
import { FormControl } from "@/components/ui/form-control";
import { Heading } from "@/components/ui/heading";
import { CheckIcon } from "@/components/ui/icon";
import { Input, InputField, InputSlot } from "@/components/ui/input";
import { Pressable } from "@/components/ui/pressable";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import {
  Toast,
  ToastDescription,
  ToastTitle,
  useToast,
} from "@/components/ui/toast";
import { trustCertificate } from "@/modules/ssl-trust";
import {
  authenticateRemote,
  SslUntrustedError,
} from "@/services/auth/authenticate";
import { reportError, scrubUrl } from "@/services/errorReporting";
import { syncSslProxy } from "@/services/sslTrust";
import useAuth, { loginSchema } from "@/stores/auth";
import useServers from "@/stores/servers";

const SERVER_TYPE = "navidrome" as const;
const SERVER_URL = "https://aurys.online";

export default function LoginScreen() {
  const [white, primary800] = Uniwind.getCSSVariable([
    "--color-white",
    "--color-primary-800",
  ]) as string[];
  const { t } = useTranslation();
  const toast = useToast();
  const params = useLocalSearchParams<{
    serverId?: string;
    username?: string;
  }>();
  const servers = useServers((store) => store.servers);
  const allUsers = useServers((store) => store.users);
  const addServer = useServers((store) => store.addServer);
  const setCurrentServer = useServers((store) => store.setCurrentServer);
  const addOrUpdateUser = useServers((store) => store.addOrUpdateUser);
  const login = useAuth((store) => store.login);
  const insets = useSafeAreaInsets();
  // biome-ignore lint/suspicious/noExplicitAny: gluestack ref typing
  const usernameRef = useRef<any>(null);
  // biome-ignore lint/suspicious/noExplicitAny: gluestack ref typing
  const passwordRef = useRef<any>(null);

  const preselectedServer = useMemo(
    () =>
      params.serverId
        ? servers.find((s) => s.id === params.serverId)
        : servers.find((s) => s.current),
    [params.serverId, servers],
  );

  const [showPassword, setShowPassword] = useState(false);
  const [sslPromptUrl, setSslPromptUrl] = useState<string | null>(null);
  const [saveCredentials, setSaveCredentials] = useState(() =>
    preselectedServer && params.username
      ? allUsers.some(
          (u) =>
            u.serverId === preselectedServer.id &&
            u.username === params.username &&
            !!u.password,
        )
      : false,
  );

  const form = useForm({
    defaultValues: {
      username: params.username ?? "",
      password: "",
    },
    validators: {
      onChange: loginSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        const trimmedUrl = SERVER_URL;
        const trimmedUsername = value.username.trim();
        const trimmedPassword = value.password.trim();

        const options = await authenticateRemote(
          SERVER_TYPE,
          trimmedUrl,
          trimmedUsername,
          trimmedPassword,
        );
        const existing = servers.find((s) => s.url === trimmedUrl);
        const fallbackName = `${t("app.servers.defaultServer")} (${formatISO(new Date())})`;
        const server = addServer({
          name: existing?.name ?? fallbackName,
          url: trimmedUrl,
          type: SERVER_TYPE,
        });
        addOrUpdateUser({
          serverId: server.id,
          username: trimmedUsername,
          password: saveCredentials ? trimmedPassword : undefined,
        });
        setCurrentServer(server.id);
        login(trimmedUrl, trimmedUsername, trimmedPassword, options);

        toast.show({
          placement: "top",
          duration: 3000,
          render: () => (
            <Toast action="success">
              <ToastTitle>{t("app.shared.toastSuccessTitle")}</ToastTitle>
              <ToastDescription>
                {t("auth.login.loginSuccessMessage")}
              </ToastDescription>
            </Toast>
          ),
        });
      } catch (error) {
        if (error instanceof SslUntrustedError) {
          setSslPromptUrl(error.url);
          return;
        }
        reportError(error, {
          area: "auth",
          endpoint: `${SERVER_TYPE} login`,
          status: axios.isAxiosError(error)
            ? error.response?.status
            : undefined,
          extra: {
            serverType: SERVER_TYPE,
            url: scrubUrl(value.url.trim()),
            hasResponse: axios.isAxiosError(error)
              ? !!error.response
              : undefined,
          },
        });
        toast.show({
          placement: "top",
          duration: 3000,
          render: () => (
            <Toast action="error">
              <ToastTitle>{t("app.shared.toastErrorTitle")}</ToastTitle>
              <ToastDescription>
                {axios.isAxiosError(error)
                  ? t("auth.login.loginErrorMessage")
                  : (error as Error).message}
              </ToastDescription>
            </Toast>
          ),
        });
      }
    },
  });

  useEffect(() => {
    if (params.username) {
      passwordRef.current?.focus();
    } else if (params.serverId) {
      usernameRef.current?.focus();
    }
  }, [params.serverId, params.username]);

  return (
    <Box className="flex-1 bg-primary-800">
      <LoginBackground />
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Box className="px-6 w-full max-w-[480px] self-center">
          <Center className="mb-4">
            <Logo width={64} height={64} />
          </Center>
          <Heading size="2xl" className="text-white font-bold mb-6">
            {t("auth.login.title")}
          </Heading>

          <form.Field name="username">
            {(field) => (
              <FormControl
                isInvalid={showFieldError(field)}
                size="md"
                isDisabled={false}
                isReadOnly={false}
                isRequired={false}
                className="my-2"
              >
                <Input className="border border-primary-600 bg-primary-600 data-[focus=true]:border-emerald-500 data-[invalid=true]:border-red-500 rounded-md px-6 py-2">
                  <InputField
                    disableFullscreenUI
                    ref={usernameRef}
                    value={field.state.value}
                    onChangeText={field.handleChange}
                    onBlur={() => handleFieldBlur(field)}
                    className="text-md text-white"
                    placeholder={t("auth.login.usernamePlaceholder")}
                    autoCapitalize="none"
                    textContentType="username"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />
                </Input>
                <FieldError field={field} />
              </FormControl>
            )}
          </form.Field>

          <form.Field name="password">
            {(field) => (
              <FormControl
                isInvalid={showFieldError(field)}
                size="md"
                isDisabled={false}
                isReadOnly={false}
                isRequired={false}
                className="my-2"
              >
                <Input className="border border-primary-600 bg-primary-600 data-[focus=true]:border-emerald-500 data-[invalid=true]:border-red-500 rounded-md px-6 py-2">
                  <InputField
                    disableFullscreenUI
                    ref={passwordRef}
                    value={field.state.value}
                    onChangeText={field.handleChange}
                    onBlur={() => handleFieldBlur(field)}
                    className="text-md text-white"
                    placeholder={t("auth.login.passwordPlaceholder")}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    textContentType="password"
                    returnKeyType="go"
                    onSubmitEditing={() => form.handleSubmit()}
                  />
                  <InputSlot>
                    <Pressable
                      onPress={() => setShowPassword((v) => !v)}
                      accessibilityRole="button"
                      accessibilityLabel={
                        showPassword
                          ? t("auth.login.hidePassword")
                          : t("auth.login.showPassword")
                      }
                    >
                      {showPassword ? (
                        <EyeOffIcon size={20} color={white} />
                      ) : (
                        <EyeIcon size={20} color={white} />
                      )}
                    </Pressable>
                  </InputSlot>
                </Input>
                <FieldError field={field} />
              </FormControl>
            )}
          </form.Field>

          <Checkbox
            value="save-credentials"
            isChecked={saveCredentials}
            onChange={setSaveCredentials}
            className="my-2"
          >
            <CheckboxIndicator className="border-primary-100 data-[checked=true]:bg-emerald-500 data-[checked=true]:border-emerald-500">
              <CheckboxIcon as={CheckIcon} />
            </CheckboxIndicator>
            <CheckboxLabel className="text-primary-100">
              {t("auth.login.saveCredentials")}
            </CheckboxLabel>
          </Checkbox>

          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <FadeOutScaleDown
                onPress={() => {
                  form.handleSubmit();
                }}
                disabled={isSubmitting}
                className="items-center justify-center py-3 px-8 border border-emerald-500 bg-emerald-500 rounded-full ml-4 mt-4"
              >
                {isSubmitting ? (
                  <Spinner color={primary800} />
                ) : (
                  <Text className="text-primary-800 font-bold text-lg">
                    {t("auth.login.login")}
                  </Text>
                )}
              </FadeOutScaleDown>
            )}
          </form.Subscribe>
        </Box>
      </KeyboardAwareScrollView>
      <CertificateTrustDialog
        isOpen={sslPromptUrl != null}
        url={sslPromptUrl}
        onClose={() => setSslPromptUrl(null)}
        onTrusted={async (hostname, fingerprint) => {
          await trustCertificate(hostname, fingerprint);
          await syncSslProxy();
          setSslPromptUrl(null);
          form.handleSubmit();
        }}
      />
    </Box>
  );
}

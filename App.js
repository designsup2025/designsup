import React, { useEffect, useState } from "react";
import { View, Button, Text, ScrollView, ActivityIndicator } from "react-native";
import * as AuthSession from "expo-auth-session";
import { SMARTTHINGS } from "./config";
import { exchangeCodeForToken, getDevices, getLocations, refreshToken } from "./smartthings";
import { saveTokens, loadTokens, clearTokens } from "./tokenStore";

const discovery = {
  authorizationEndpoint: SMARTTHINGS.authUrl,
  tokenEndpoint: SMARTTHINGS.tokenUrl,
};

export default function App() {
  const [token, setToken] = useState(null);
  const [refresh, setRefresh] = useState(null);
  const [devices, setDevices] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      const t = await loadTokens();
      setToken(t.access || null);
      setRefresh(t.refresh || null);
    })();
  }, []);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: SMARTTHINGS.clientId,
      scopes: ["devices:read", "devices:write", "locations:read"],
      redirectUri: SMARTTHINGS.redirectUri,
      usePKCE: false, // SmartThings는 대부분 불필요
    },
    discovery
  );

  useEffect(() => {
    (async () => {
      try {
        if (response?.type === "success" && response.params?.code) {
          setLoading(true);
          setErr(null);
          const tokenData = await exchangeCodeForToken(response.params.code);
          setToken(tokenData.access_token);
          setRefresh(tokenData.refresh_token);
          await saveTokens({ access: tokenData.access_token, refresh: tokenData.refresh_token });
        }
      } catch (e) {
        setErr("토큰 교환 실패: " + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [response]);

  const handleLogin = () => {
    setErr(null);
    promptAsync();
  };

  const handleLogout = async () => {
    await clearTokens();
    setToken(null);
    setRefresh(null);
    setDevices([]); setLocations([]);
  };

  const loadLocations = async () => {
    try {
      setLoading(true);
      setErr(null);
      let at = token;
      try {
        const locs = await getLocations(at);
        setLocations(locs);
      } catch (e) {
        if (e.response?.status === 401 && refresh) {
          const t = await refreshToken(refresh);
          at = t.access_token; setToken(at);
          await saveTokens({ access: at, refresh: t.refresh_token ?? refresh });
          const locs2 = await getLocations(at);
          setLocations(locs2);
        } else throw e;
      }
    } catch (e) {
      setErr("위치 불러오기 실패: " + e.message);
    } finally { setLoading(false); }
  };

  const loadDevices = async () => {
    try {
      setLoading(true);
      setErr(null);
      let at = token;
      try {
        const devs = await getDevices(at);
        setDevices(devs);
      } catch (e) {
        if (e.response?.status === 401 && refresh) {
          const t = await refreshToken(refresh);
          at = t.access_token; setToken(at);
          await saveTokens({ access: at, refresh: t.refresh_token ?? refresh });
          const devs2 = await getDevices(at);
          setDevices(devs2);
        } else throw e;
      }
    } catch (e) {
      setErr("기기 불러오기 실패: " + e.message);
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={{ marginTop: 60, padding: 16 }}>
      {!token ? (
        <Button title="로그인 (SMARTTHINGS)" onPress={handleLogin} disabled={!request} />
      ) : (
        <Button title="로그아웃" color="#c63" onPress={handleLogout} />
      )}

      {loading && <ActivityIndicator size="large" style={{ marginVertical: 20 }} />}
      {err && <Text style={{ color: "red", marginVertical: 12 }}>{err}</Text>}

      {token && (
        <>
          <Button title="위치 불러오기" onPress={loadLocations} />
          {locations.map((l) => (<Text key={l.locationId}>🏠 {l.name}</Text>))}

          <Button title="기기 불러오기" onPress={loadDevices} />
          {devices.map((d) => (<Text key={d.deviceId}>🔌 {d.label || d.name}</Text>))}
        </>
      )}
    </ScrollView>
  );
}

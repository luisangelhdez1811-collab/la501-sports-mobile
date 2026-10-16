import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { getMessages, markMessageAttended, type AdminMessage, type MessageFilter } from '@/api/admin';
import { errorMessage } from '@/api/client';
import { AdminColors, Panel, PanelState, Segmented, StatCard, StatGrid, Tag } from '@/components/admin/admin-ui';
import { AdminScreen } from '@/components/admin/admin-screen';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useAdminResource } from '@/hooks/use-admin-resource';
import { useBrandTheme } from '@/hooks/use-brand-theme';

const FILTERS = [
  { value: 'todos', label: 'Todos' },
  { value: 'pendientes', label: 'Pendientes' },
  { value: 'atendidos', label: 'Atendidos' },
  { value: 'quejas', label: 'Quejas' },
  { value: 'sugerencias', label: 'Sugerencias' },
] as const;

const TYPE = {
  queja: { label: 'Queja', color: Brand.red },
  sugerencia: { label: 'Sugerencia', color: AdminColors.yellow },
  pregunta: { label: 'Pregunta', color: Brand.blue },
  otro: { label: 'Mensaje', color: Brand.blue },
} as const;

const SEARCH_DELAY_MS = 400;
const shortDate = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export default function AdminMessagesScreen() {
  const { colors, scheme } = useBrandTheme();
  const [filter, setFilter] = useState<MessageFilter>('todos');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const list = useAdminResource(`messages-${filter}-${search}`, (signal) => getMessages(filter, search, signal));
  const counts = list.data?.counts;
  const items = list.data?.items ?? [];

  // Searches shortly after typing stops, so each keystroke isn't a request.
  const onQueryChange = (text: string) => {
    setQuery(text);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(text.trim()), SEARCH_DELAY_MS);
  };

  return (
    <AdminScreen
      title="Bandeja de mensajes"
      subtitle="Gestiona las quejas, sugerencias y preguntas de tus clientes."
      refreshing={list.refreshing}
      onRefresh={list.refresh}>

      <StatGrid>
        <StatCard
          label="Total mensajes"
          value={counts ? String(counts.total) : '—'}
          icon={{ ios: 'bubble.left', android: 'chat', web: 'chat' }}
          color={Brand.blue}
          selected={filter === 'todos'}
          onPress={() => setFilter('todos')}
        />
        <StatCard
          label="Pendientes"
          value={counts ? String(counts.pendientes) : '—'}
          icon={{ ios: 'exclamationmark.circle', android: 'error', web: 'error' }}
          color={Brand.red}
          selected={filter === 'pendientes'}
          onPress={() => setFilter('pendientes')}
        />
        <StatCard
          label="Quejas"
          value={counts ? String(counts.quejas) : '—'}
          icon={{ ios: 'exclamationmark.triangle', android: 'warning', web: 'warning' }}
          color={Brand.orange}
          selected={filter === 'quejas'}
          onPress={() => setFilter('quejas')}
        />
        <StatCard
          label="Atendidos"
          value={counts ? String(counts.atendidos) : '—'}
          icon={{ ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }}
          color={Brand.greenLight}
          selected={filter === 'atendidos'}
          onPress={() => setFilter('atendidos')}
        />
      </StatGrid>

      <View
        style={[
          styles.search,
          { borderColor: colors.border, backgroundColor: scheme === 'dark' ? '#121110' : colors.surface },
        ]}>
        <SymbolView name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} size={18} tintColor={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder="Buscar por nombre, asunto o correo"
          placeholderTextColor={colors.textSecondary}
          selectionColor={Brand.orange}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={() => {
            clearTimeout(searchTimer.current);
            setSearch(query.trim());
          }}
          style={[styles.searchInput, { color: colors.text }]}
          accessibilityLabel="Buscar mensajes"
        />
        {!!query && (
          <Pressable accessibilityRole="button" accessibilityLabel="Borrar búsqueda" hitSlop={8} onPress={() => onQueryChange('')}>
            <SymbolView name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }} size={18} tintColor={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      <Segmented options={FILTERS} value={filter} onChange={setFilter} color={Brand.blue} />

      <Panel
        icon={{ ios: 'bubble.left.and.bubble.right', android: 'forum', web: 'forum' }}
        title="Mensajes"
        count={list.data ? items.length : undefined}>
        <PanelState
          loading={list.loading}
          error={list.error}
          unavailable={list.unavailable}
          endpoint="GET /app/admin/messages"
          empty={!!list.data && items.length === 0}
          emptyText={search ? 'No hay mensajes que coincidan con la búsqueda.' : 'No hay mensajes en esta sección.'}
          onRetry={list.reload}
        />
        {items.map((message) => (
          <MessageCard key={message.id} message={message} onChanged={list.reload} />
        ))}
      </Panel>
    </AdminScreen>
  );
}

function MessageCard({ message, onChanged }: { message: AdminMessage; onChanged: () => void }) {
  const { colors } = useBrandTheme();
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const type = TYPE[message.type];

  const markAttended = async () => {
    setBusy(true);
    try {
      await markMessageAttended(message.id);
      onChanged();
    } catch (err) {
      Alert.alert('No se pudo actualizar', errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const reply = () => {
    const subject = encodeURIComponent(`Re: ${message.subject || 'Tu mensaje a La 501'}`);
    Linking.openURL(`mailto:${message.email}?subject=${subject}`).catch(() =>
      Alert.alert('No se pudo abrir el correo', message.email),
    );
  };

  return (
    <View
      style={[
        styles.card,
        { borderColor: colors.border, backgroundColor: colors.background, borderLeftColor: message.attended ? Brand.greenLight : Brand.blue },
      ]}>
      <Pressable accessibilityRole="button" accessibilityHint="Muestra el mensaje completo" onPress={() => setExpanded((v) => !v)} style={styles.cardMain}>
        <View style={styles.cardTop}>
          <View style={styles.cardWho}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {message.name || 'Sin nombre'}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {message.email}
            </Text>
          </View>
          {!!message.createdAt && (
            <Text style={[styles.date, { color: colors.textSecondary }]}>{shortDate.format(message.createdAt)}</Text>
          )}
        </View>
        <View style={styles.tags}>
          <Tag label={type.label} color={type.color} />
          <Tag label={message.attended ? 'Atendido' : 'Pendiente'} color={message.attended ? Brand.greenLight : Brand.red} />
        </View>
        {!!message.subject && (
          <Text style={[styles.subject, { color: colors.text }]} numberOfLines={expanded ? undefined : 1}>
            {message.subject}
          </Text>
        )}
        {!!message.body && (
          <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={expanded ? undefined : 2}>
            {message.body}
          </Text>
        )}
      </Pressable>

      <View style={styles.actions}>
        {!!message.email && (
          <Pressable
            accessibilityRole="button"
            onPress={reply}
            style={({ pressed }) => [styles.action, { borderColor: `${Brand.blue}66`, backgroundColor: pressed ? `${Brand.blue}33` : `${Brand.blue}14` }]}>
            <Text style={[styles.actionText, { color: Brand.blue }]}>Responder</Text>
          </Pressable>
        )}
        {!message.attended && (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={markAttended}
            style={({ pressed }) => [styles.action, { borderColor: `${Brand.green}66`, backgroundColor: pressed ? `${Brand.green}33` : `${Brand.green}14` }]}>
            <Text style={[styles.actionText, { color: Brand.greenLight }]}>{busy ? 'Guardando…' : 'Marcar atendido'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: BrandFonts.body,
    fontSize: 15,
    paddingVertical: 12,
  },
  card: {
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: Radius.md,
    padding: 14,
    gap: 12,
  },
  cardMain: {
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardWho: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 16,
  },
  email: {
    color: Brand.blue,
    fontFamily: BrandFonts.body,
    fontSize: 13,
  },
  date: {
    fontFamily: BrandFonts.body,
    fontSize: 12,
  },
  tags: {
    flexDirection: 'row',
    gap: 6,
  },
  subject: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 15,
  },
  body: {
    fontFamily: BrandFonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  action: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 14,
  },
});

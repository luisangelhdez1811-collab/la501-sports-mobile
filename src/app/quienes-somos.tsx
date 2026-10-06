import { Image } from 'expo-image';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { BrandScreen } from '@/components/brand/brand-screen';
import { PageHero } from '@/components/brand/page-hero';
import { BrandTitle, DividerLabel, SectionHeading } from '@/components/brand/typography';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';

type Icon = SymbolViewProps['name'];

const OPENING_DATE = new Date(2023, 9, 26); // 26 Oct 2023, La 501 Sports Restaurant

const HIGHLIGHTS = [
  { value: '2020', label: 'Nuestros inicios' },
  { value: '2023', label: 'Sports Restaurant' },
  { value: 'Huejutla', label: 'Hidalgo' },
];

const PURPOSE: { icon: Icon; title: string; color: string; text: string }[] = [
  {
    icon: { ios: 'flag.fill', android: 'flag', web: 'flag' },
    title: 'Nuestra misión',
    color: Brand.orange,
    text: 'Ofrecer al cliente una experiencia diferente en el municipio, con gran sabor y diversión, de la mano de productos de calidad y de un espacio recreativo diseñado para disfrutar las mejores transmisiones deportivas, atendido por personal joven, entusiasta y capacitado.',
  },
  {
    icon: { ios: 'eye.fill', android: 'visibility', web: 'visibility' },
    title: 'Nuestra visión',
    color: Brand.greenLight,
    text: 'Posicionar la marca a nivel nacional, con capacidad de brindar una gran experiencia y competir con las cadenas actuales con presencia en el mercado de nuestro país.',
  },
];

const VALUES: { icon: Icon; title: string; text: string }[] = [
  {
    icon: { ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' },
    title: 'Responsabilidad',
    text: 'Cumplimos lo que prometemos, cuidando cada detalle del servicio y la experiencia del cliente.',
  },
  {
    icon: { ios: 'rosette', android: 'workspace_premium', web: 'workspace_premium' },
    title: 'Profesionalismo',
    text: 'Personal joven, capacitado y comprometido para brindarte siempre la mejor atención.',
  },
  {
    icon: { ios: 'hand.raised.fill', android: 'handshake', web: 'handshake' },
    title: 'Honestidad',
    text: 'Transparencia en cada platillo, cada cuenta y cada trato con nuestros clientes.',
  },
  {
    icon: { ios: 'star.fill', android: 'star', web: 'star' },
    title: 'Calidad',
    text: 'Ingredientes frescos y procesos cuidados en cada preparación que sale de nuestra cocina.',
  },
];

const HISTORY = [
  {
    tag: '2020',
    title: 'La Papa 501',
    text: 'Nace en Huejutla, Hidalgo, de la mano de Andrés Rivera. Al inicio vendía únicamente conos de papas con toppings y, durante la pandemia, operaba con venta directa desde el automóvil.',
  },
  {
    tag: '501',
    title: 'El porqué del nombre',
    text: 'Es un homenaje a la histórica locomotora 501 y a Jesús García, el maquinista que dio la vida por salvar al pueblo de Nacozari, Sonora, y se convirtió en héroe nacional.',
  },
  {
    tag: '2023',
    title: 'La 501 Sports Restaurant',
    text: 'Tras pasar por distintos food parks, el 26 de octubre de 2023 abrimos nuestro establecimiento fijo con nueva imagen, un menú más extenso y el ambiente deportivo que hoy nos caracteriza.',
  },
];

function yearsSince(date: Date) {
  const now = new Date();
  let years = now.getFullYear() - date.getFullYear();
  const anniversaryPassed =
    now.getMonth() > date.getMonth() ||
    (now.getMonth() === date.getMonth() && now.getDate() >= date.getDate());
  if (!anniversaryPassed) years -= 1;
  return Math.max(years, 0);
}

function IconBadge({ icon, color = Brand.orange, size = 44 }: { icon: Icon; color?: string; size?: number }) {
  return (
    <View
      style={[
        styles.iconBadge,
        { width: size, height: size, borderRadius: size * 0.3, backgroundColor: `${color}1F`, borderColor: `${color}55` },
      ]}>
      <SymbolView name={icon} size={size * 0.5} tintColor={color} />
    </View>
  );
}

export default function AboutScreen() {
  const { colors } = useBrandTheme();
  const years = yearsSince(OPENING_DATE);

  const card = [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }];

  return (
    <BrandScreen showBack contentStyle={styles.content}>
      <PageHero
        align="center"
        tag="La 501 Sports Restaurant"
        lead="¿Quiénes"
        accent="somos?"
        description="Donde la pasión por el deporte y la buena comida se unen para vivir la mejor experiencia junto a toda la afición."
      />

      <View style={styles.body}>
        <View style={[styles.hashtag, { borderColor: `${Brand.orange}55`, backgroundColor: `${Brand.orange}14` }]}>
          <Text style={styles.hashtagText}>#AquíEstáLoChido</Text>
        </View>

        <View style={styles.highlights}>
          {HIGHLIGHTS.map((item) => (
            <View key={item.label} style={[card, styles.highlight]}>
              <Text style={styles.highlightValue} numberOfLines={1} adjustsFontSizeToFit>
                {item.value}
              </Text>
              <Text style={[styles.highlightLabel, { color: colors.textSecondary }]} numberOfLines={2}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={[card, styles.homeCard]}>
          <BrandTitle lead="Más que un restaurante, somos tu" accent="segundo hogar" size={30} />
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            Somos el lugar favorito de la afición en Huejutla para disfrutar alitas, boneless,
            hamburguesas y bebidas refrescantes mientras vivimos las mejores transmisiones deportivas en
            vivo, en un espacio pensado para reunir a toda la afición.
          </Text>
        </View>

        <DividerLabel>Misión y visión</DividerLabel>
        {PURPOSE.map((item) => (
          <View key={item.title} style={[card, styles.purposeCard, { borderTopColor: item.color }]}>
            <View style={styles.purposeHeader}>
              <IconBadge icon={item.icon} color={item.color} />
              <Text style={[styles.cardLabel, { color: item.color }]}>{item.title}</Text>
            </View>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>{item.text}</Text>
          </View>
        ))}

        <DividerLabel>Nuestros valores</DividerLabel>
        <View style={[card, styles.valuesCard]}>
          {VALUES.map((value, i) => (
            <View
              key={value.title}
              style={[
                styles.valueRow,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
              ]}>
              <IconBadge icon={value.icon} />
              <View style={styles.valueText}>
                <Text style={[styles.valueTitle, { color: colors.text }]}>{value.title}</Text>
                <Text style={[styles.small, { color: colors.textSecondary }]}>{value.text}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.historyHeading}>
          <SectionHeading>
            <BrandTitle lead="Nuestra" accent="historia" accentColor="green" size={40} />
          </SectionHeading>
        </View>
        <View style={styles.timeline}>
          {HISTORY.map((step, i) => (
            <View key={step.tag} style={styles.step}>
              <View style={styles.rail}>
                <View style={[styles.dot, { borderColor: colors.background }]} />
                {i < HISTORY.length - 1 && <View style={[styles.railLine, { backgroundColor: colors.border }]} />}
              </View>
              <View style={[card, styles.stepCard]}>
                <Text style={styles.stepTag}>{step.tag}</Text>
                <Text style={[styles.stepTitle, { color: colors.text }]}>{step.title}</Text>
                <Text style={[styles.small, { color: colors.textSecondary }]}>{step.text}</Text>
              </View>
            </View>
          ))}
        </View>

        {years > 0 && (
          <View style={styles.anniversary}>
            <Text style={styles.anniversaryYears}>{years}</Text>
            <View style={styles.anniversaryTextBox}>
              <Text style={styles.anniversaryUnit}>{years === 1 ? 'año' : 'años'}</Text>
              <Text style={styles.anniversaryText}>como La 501 Sports Restaurant</Text>
            </View>
          </View>
        )}

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <View style={styles.footerAccent} />
          <Image
            source={require('@/assets/images/logo-501.png')}
            style={styles.footerLogo}
            contentFit="contain"
            accessibilityLabel="La 501 Sports Restaurant"
          />
          <Text style={[styles.footerTitle, { color: colors.text }]}>Restaurant La 501 Sports</Text>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Donde el deporte y la familia se unen
          </Text>
          <Text style={[styles.footerCopy, { color: colors.textSecondary }]}>
            © {new Date().getFullYear()} La 501 Sports. Todos los derechos reservados.
          </Text>
        </View>
      </View>
    </BrandScreen>
  );
}

const DOT = 14;

const styles = StyleSheet.create({
  content: {
    padding: 0,
    paddingTop: 0,
  },
  body: {
    padding: 16,
    gap: 18,
  },
  paragraph: {
    fontFamily: BrandFonts.body,
    fontSize: 15,
    lineHeight: 24,
  },
  small: {
    fontFamily: BrandFonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: 18,
    gap: 12,
  },
  hashtag: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginTop: -4,
  },
  hashtagText: {
    color: Brand.orange,
    fontFamily: BrandFonts.labelBold,
    fontSize: 14,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  highlights: {
    flexDirection: 'row',
    gap: 10,
  },
  highlight: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 14,
    gap: 2,
  },
  highlightValue: {
    color: Brand.orange,
    fontFamily: BrandFonts.display,
    fontSize: 30,
    letterSpacing: 1,
  },
  highlightLabel: {
    fontFamily: BrandFonts.label,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  homeCard: {
    borderLeftWidth: 4,
    borderLeftColor: Brand.orange,
  },
  purposeCard: {
    borderTopWidth: 3,
  },
  purposeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardLabel: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 18,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  iconBadge: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valuesCard: {
    paddingVertical: 4,
    gap: 0,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 14,
  },
  valueText: {
    flex: 1,
    gap: 2,
  },
  valueTitle: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 16,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  historyHeading: {
    marginTop: 10,
  },
  timeline: {
    gap: 0,
  },
  step: {
    flexDirection: 'row',
    gap: 12,
  },
  rail: {
    width: DOT,
    alignItems: 'center',
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 3,
    backgroundColor: Brand.orange,
    marginTop: 20,
  },
  railLine: {
    flex: 1,
    width: 2,
    marginVertical: 4,
  },
  stepCard: {
    flex: 1,
    gap: 4,
    marginBottom: 12,
  },
  stepTag: {
    color: Brand.orange,
    fontFamily: BrandFonts.display,
    fontSize: 26,
    letterSpacing: 1.5,
    lineHeight: 28,
  },
  stepTitle: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 16,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  anniversary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: Radius.lg,
    paddingVertical: 18,
    paddingHorizontal: 22,
    experimental_backgroundImage: `linear-gradient(135deg, ${Brand.orange}, ${Brand.orangeDark})`,
    boxShadow: `0 8px 24px ${Brand.orange}40`,
  },
  anniversaryYears: {
    color: Brand.white,
    fontFamily: BrandFonts.display,
    fontSize: 64,
    lineHeight: 66,
  },
  anniversaryTextBox: {
    flex: 1,
  },
  anniversaryUnit: {
    color: Brand.white,
    fontFamily: BrandFonts.display,
    fontSize: 30,
    letterSpacing: 2,
    textTransform: 'uppercase',
    lineHeight: 32,
  },
  anniversaryText: {
    color: Brand.white,
    opacity: 0.9,
    fontFamily: BrandFonts.label,
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  footer: {
    alignItems: 'center',
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 24,
    marginTop: 8,
  },
  footerAccent: {
    width: 48,
    height: 3,
    borderRadius: 2,
    marginBottom: 8,
    experimental_backgroundImage: `linear-gradient(90deg, ${Brand.orange}, ${Brand.green})`,
  },
  footerLogo: {
    height: 52,
    aspectRatio: 1224 / 624,
  },
  footerTitle: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 18,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  footerText: {
    fontFamily: BrandFonts.body,
    fontSize: 14,
    textAlign: 'center',
  },
  footerCopy: {
    fontFamily: BrandFonts.body,
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
});

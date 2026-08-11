import { StyleSheet, Text, View } from 'react-native';

type PdfMarkProps = {
  size?: number;
};

export function PdfMark({ size = 128 }: PdfMarkProps) {
  const sheetW = size * 0.72;
  const sheetH = size * 0.82;
  const radius = size * 0.07;
  const fold = size * 0.2;
  const pad = size * 0.11;
  const lineW = size * 0.34;
  const lineH = Math.max(4, size * 0.035);
  const lineGap = size * 0.05;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View
        style={[
          styles.shadow,
          { width: sheetW, height: sheetH, borderRadius: radius },
        ]}>
        <View
          style={[
            styles.sheet,
            { borderRadius: radius, transform: [{ rotate: '-3deg' }] },
          ]}>
          <View
            style={[
              styles.tag,
              {
                paddingHorizontal: size * 0.055,
                paddingVertical: size * 0.014,
                borderBottomRightRadius: radius * 0.8,
              },
            ]}>
            <Text style={[styles.tagText, { fontSize: size * 0.11 }]}>PDF</Text>
          </View>

          <View style={[styles.lines, { left: pad, top: size * 0.34 }]}>
            <View style={[styles.line, { width: lineW, height: lineH, marginBottom: lineGap }]} />
            <View
              style={[
                styles.line,
                { width: lineW * 0.82, height: lineH, marginBottom: lineGap },
              ]}
            />
            <View style={[styles.line, { width: lineW * 0.6, height: lineH }]} />
          </View>

          <View
            style={[
              styles.fold,
              {
                width: fold,
                height: fold,
                right: -fold * 0.45,
                bottom: -fold * 0.45,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadow: {
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  sheet: {
    flex: 1,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  tag: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#E5484D',
  },
  tagText: {
    color: '#ffffff',
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  lines: {
    position: 'absolute',
  },
  line: {
    backgroundColor: '#D9DCE2',
    borderRadius: 3,
  },
  fold: {
    position: 'absolute',
    backgroundColor: '#E9EBEF',
    transform: [{ rotate: '45deg' }],
  },
});

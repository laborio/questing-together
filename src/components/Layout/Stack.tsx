import { View, type ViewProps, type ViewStyle } from 'react-native';

type StackProps = ViewProps & {
  direction?: 'column' | 'row';
  gap?: number;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  flex?: number;
  wrap?: ViewStyle['flexWrap'];
  shrink?: number;
  grow?: number;
  basis?: ViewStyle['flexBasis'];
};

const Stack = ({
  direction = 'column',
  gap = 0,
  align,
  justify,
  flex,
  wrap,
  shrink,
  grow,
  basis,
  style,
  ...props
}: StackProps) => {
  return (
    <View
      style={[
        { flexDirection: direction, gap },
        align != null && { alignItems: align },
        justify != null && { justifyContent: justify },
        flex != null && { flex },
        wrap != null && { flexWrap: wrap },
        shrink != null && { flexShrink: shrink },
        grow != null && { flexGrow: grow },
        basis != null && { flexBasis: basis },
        style,
      ]}
      {...props}
    />
  );
};

export default Stack;

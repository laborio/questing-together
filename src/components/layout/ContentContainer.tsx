import { View, type ViewProps } from 'react-native';

const ContentContainer = ({ style, ...props }: ViewProps) => {
  return (
    <View
      style={[
        {
          flex: 1,
          width: '100%',
          alignSelf: 'center',
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 28,
          alignItems: 'center',
        },
        style,
      ]}
      {...props}
    />
  );
};

export default ContentContainer;

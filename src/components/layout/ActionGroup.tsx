import { View, type ViewProps } from 'react-native';

type ActionGroupProps = ViewProps & {
  gap?: number;
};

const ActionGroup = ({ gap = 10, style, ...props }: ActionGroupProps) => {
  return (
    <View
      style={[{ width: '100%', alignItems: 'center', gap, marginTop: 'auto' }, style]}
      {...props}
    />
  );
};

export default ActionGroup;

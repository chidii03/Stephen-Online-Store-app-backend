import { Pressable, StyleSheet, Text, View } from "react-native";

export default function Todo({todo, onDelete}) {
    return (
        <Pressable onPress={() => onDelete(todo.id)} style={styles.todo}>
            <View>
                <Text>{todo.todo}</Text>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    todo: {
        backgroundColor: 'purple',
        padding: 10,
        borderRadius: 10,
        width: '80%',
  }
});
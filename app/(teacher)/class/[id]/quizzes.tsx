import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from "react-native";

import { Button, Screen, TextField, ThemedText } from "@/components";
import { colors, getAccent, radii, spacing } from "@/constants/theme";
import { useClass, useClassQuizzes } from "@/hooks/useClasses";
import { supabase } from "@/lib/supabase";
import type { Quiz, QuizStatus } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<QuizStatus, string> = {
  draft: "#94a3b8",
  published: "#16a34a",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Create Quiz Modal (inline form)
// ---------------------------------------------------------------------------

function CreateQuizForm({
  classId,
  onCreated,
  onCancel,
}: {
  classId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setLoading(true);
    setError("");

    const { error: insertError } = await supabase.from("quizzes").insert({
      class_id: classId,
      title: title.trim(),
      description: description.trim() || null,
      status: "draft",
    });

    setLoading(false);

    if (insertError) {
      Alert.alert("Error", insertError.message);
      return;
    }

    onCreated();
  };

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.lg,
        gap: spacing.md,
        marginBottom: spacing.md,
      }}
    >
      <ThemedText variant="heading">New Quiz</ThemedText>
      <TextField
        label="Title"
        placeholder="e.g. Chapter 1 Review"
        value={title}
        onChangeText={(text) => {
          setTitle(text);
          if (error) setError("");
        }}
        error={error}
      />
      <TextField
        label="Description (optional)"
        placeholder="Brief description of the quiz"
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <Button
          label="Create Draft"
          fullWidth
          loading={loading}
          onPress={handleCreate}
        />
        <Button label="Cancel" variant="ghost" fullWidth onPress={onCancel} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Quiz Card
// ---------------------------------------------------------------------------

function QuizCard({ quiz }: { quiz: Quiz }) {
  const statusColor = STATUS_COLORS[quiz.status];

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.lg,
        gap: spacing.sm,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <View style={{ flex: 1, gap: spacing.xs }}>
          <ThemedText variant="heading">{quiz.title}</ThemedText>
          {quiz.description ? (
            <ThemedText variant="caption" muted numberOfLines={2}>
              {quiz.description}
            </ThemedText>
          ) : null}
        </View>
        <View
          style={{
            backgroundColor: statusColor + "18",
            borderRadius: radii.pill,
            paddingHorizontal: spacing.sm,
            paddingVertical: 2,
          }}
        >
          <ThemedText
            variant="small"
            style={{
              color: statusColor,
              fontWeight: "600",
              textTransform: "capitalize",
            }}
          >
            {quiz.status}
          </ThemedText>
        </View>
      </View>
      <ThemedText variant="small" muted>
        Created {formatDate(quiz.created_at)}
      </ThemedText>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Quizzes Screen
// ---------------------------------------------------------------------------

export default function QuizzesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const classId = id ?? "";
  const accent = getAccent("teacher");
  const { classData } = useClass(classId);
  const { quizzes, loading, refreshing, refresh } = useClassQuizzes(classId);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleQuizCreated = () => {
    setShowCreateForm(false);
    void refresh();
  };

  const renderQuiz = ({ item }: { item: Quiz }) => <QuizCard quiz={item} />;

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingVertical: spacing.xxl,
        }}
      >
        <ThemedText
          variant="heading"
          muted
          style={{ marginBottom: spacing.sm }}
        >
          No quizzes yet
        </ThemedText>
        <ThemedText muted style={{ textAlign: "center" }}>
          Create your first quiz to assess your students.
        </ThemedText>
      </View>
    );
  };

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.md,
            paddingTop: spacing.lg,
            paddingBottom: spacing.md,
          }}
        >
          <Pressable onPress={() => router.back()}>
            <ThemedText style={{ fontSize: 24 }}>←</ThemedText>
          </Pressable>
          <View style={{ flex: 1 }}>
            <ThemedText variant="heading" numberOfLines={1}>
              Quizzes
            </ThemedText>
            {classData && (
              <ThemedText variant="small" muted>
                {classData.name}
              </ThemedText>
            )}
          </View>
        </View>

        {/* Create Quiz button */}
        {!showCreateForm && (
          <View style={{ marginBottom: spacing.md }}>
            <Button
              label="Create Quiz"
              fullWidth
              onPress={() => setShowCreateForm(true)}
            />
          </View>
        )}

        {/* Create form */}
        {showCreateForm && (
          <CreateQuizForm
            classId={classId}
            onCreated={handleQuizCreated}
            onCancel={() => setShowCreateForm(false)}
          />
        )}

        {/* Quiz list */}
        {loading && quizzes.length === 0 ? (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <ActivityIndicator size="large" color={accent.accent} />
          </View>
        ) : (
          <FlatList
            data={quizzes}
            keyExtractor={(item) => item.id}
            renderItem={renderQuiz}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={{
              gap: spacing.md,
              paddingBottom: spacing.lg,
              flexGrow: 1,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor={accent.accent}
                colors={[accent.accent]}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* TODO: Part 5 — Assessment Engine integration */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
          }}
        >
          <ThemedText variant="small" muted style={{ textAlign: "center" }}>
            {/* TODO: Wire quiz detail/edit screens to the Assessment Engine (Part 5).
                Each quiz card should navigate to a quiz builder/editor where teachers
                can add questions, set points, and publish the quiz. */}
            Quiz editor coming in Part 5 — Assessment Engine
          </ThemedText>
        </View>
      </View>
    </Screen>
  );
}

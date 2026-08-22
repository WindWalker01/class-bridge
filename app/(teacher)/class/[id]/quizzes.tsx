import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from "react-native";

import {
  AnimatedListItem,
  Badge,
  Button,
  Card,
  EmptyState,
  FadeInView,
  Screen,
  ScreenHeader,
  SkeletonCard,
  TextField,
  ThemedText,
  useToast,
} from "@/components";
import { Clipboard, ClipboardList } from "lucide-react-native";
import { radii, spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useResponsive } from "@/hooks/useResponsive";
import { useClass, useClassQuizzes } from "@/hooks/useClasses";
import { useGradeCategories } from "@/hooks/useGradeEngine";
import { supabase } from "@/lib/supabase";
import type { GradeCategory, Quiz, QuizStatus } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_TO_TONE: Record<QuizStatus, "neutral" | "success" | "danger"> = {
  draft: "neutral",
  published: "success",
  closed: "danger",
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
  const { colors } = useTheme();
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

function QuizCard({ quiz, classId, categoryName }: { quiz: Quiz; classId: string; categoryName?: string }) {
  const tone = STATUS_TO_TONE[quiz.status];
  const { colors } = useTheme();

  return (
    <Card
      variant="flat"
      onPress={() =>
        router.push(
          `/(teacher)/class/${classId}/quizzes/${quiz.id}/edit` as any,
        )
      }
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: spacing.sm,
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
        <Badge label={quiz.status} tone={tone} size="sm" />
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          flexWrap: "wrap",
        }}
      >
        <ThemedText variant="small" muted>
          Created {formatDate(quiz.created_at)}
        </ThemedText>
        {categoryName && (
          <View
            style={{
              backgroundColor: colors.surfaceMuted,
              borderRadius: 4,
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}
          >
            <ThemedText
              variant="small"
              muted
              style={{ fontSize: 11, lineHeight: 14 }}
            >
              {categoryName}
            </ThemedText>
          </View>
        )}
        {quiz.due_at && (
          <ThemedText
            variant="small"
            muted
            style={{
              color: new Date(quiz.due_at) < new Date() ? colors.danger : colors.textMuted,
            }}
          >
            Due {formatDate(quiz.due_at)}
            {new Date(quiz.due_at) < new Date() ? " (Overdue)" : ""}
          </ThemedText>
        )}
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Quizzes Screen
// ---------------------------------------------------------------------------

export default function QuizzesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const classId = id ?? "";
  const { colors, accent } = useTheme();
  const { isTablet } = useResponsive();
  const { classData } = useClass(classId);
  const { quizzes, loading, refreshing, refresh } = useClassQuizzes(classId);
  const { categories } = useGradeCategories(classId);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Build a lookup map: categoryId -> categoryName
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const handleQuizCreated = () => {
    setShowCreateForm(false);
    void refresh();
  };

  const renderQuiz = ({ item }: { item: Quiz }) => (
    <QuizCard
      quiz={item}
      classId={classId}
      categoryName={item.category_id ? categoryMap.get(item.category_id) : undefined}
    />
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <EmptyState
        title="No quizzes yet"
        message="Create your first quiz to assess your students."
        icon={ClipboardList}
        actionLabel="Create Quiz"
        onAction={() =>
          router.push(`/(teacher)/class/${classId}/quizzes/create` as any)
        }
      />
    );
  };

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <ScreenHeader
          title="Quizzes"
          subtitle={classData?.name}
          onBack={() => router.back()}
        />

        {/* Create Quiz button */}
        {!showCreateForm && (
          <View style={{ marginBottom: spacing.md }}>
            <Button
              label="Create Quiz"
              fullWidth
              onPress={() =>
                router.push(`/(teacher)/class/${classId}/quizzes/create` as any)
              }
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
            style={{
              flex: 1,
              justifyContent: "center",
              paddingTop: spacing.xxl,
            }}
          >
            <FadeInView>
              <View style={{ gap: spacing.md }}>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </View>
            </FadeInView>
          </View>
        ) : (
          <FlatList
            data={quizzes}
            keyExtractor={(item) => item.id}
            key={isTablet ? "grid" : "list"}
            numColumns={isTablet ? 2 : undefined}
            renderItem={({ item, index }) => (
              <AnimatedListItem index={index}>
                {renderQuiz({ item })}
              </AnimatedListItem>
            )}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={{
              gap: spacing.md,
              paddingBottom: spacing.lg,
              flexGrow: 1,
            }}
            columnWrapperStyle={isTablet ? { gap: spacing.md } : undefined}
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
      </View>
    </Screen>
  );
}

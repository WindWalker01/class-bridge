import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  View,
} from "react-native";

import { Screen, ThemedText } from "@/components";
import { colors, getAccent, radii, spacing } from "@/constants/theme";
import { useClass, useClassFeed } from "@/hooks/useClasses";
import { Routes } from "@/lib/navigation";
import type { Attachment, PostType, PostWithDetails } from "@/types";

// ---------------------------------------------------------------------------
// Helpers (shared with teacher feed)
// ---------------------------------------------------------------------------

const POST_TYPE_LABELS: Record<PostType, string> = {
  announcement: "Announcement",
  material: "Material",
  quiz_link: "Quiz Link",
};

const POST_TYPE_COLORS: Record<PostType, string> = {
  announcement: "#2563eb",
  material: "#7c3aed",
  quiz_link: "#d97706",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString();
}

function isImageType(mime: string): boolean {
  return mime.startsWith("image/");
}

// ---------------------------------------------------------------------------
// Attachment Thumbnail
// ---------------------------------------------------------------------------

function AttachmentThumbnail({ attachment }: { attachment: Attachment }) {
  if (isImageType(attachment.file_type)) {
    return (
      <Pressable
        onPress={() => {
          Alert.alert(attachment.file_name, attachment.file_url);
        }}
        style={{
          borderRadius: radii.sm,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Image
          source={{ uri: attachment.file_url }}
          style={{ width: 120, height: 90 }}
          resizeMode="cover"
        />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => {
        Alert.alert(attachment.file_name, attachment.file_url);
      }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        backgroundColor: colors.surfaceMuted,
        borderRadius: radii.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <ThemedText variant="small" style={{ fontSize: 20 }}>
        📎
      </ThemedText>
      <ThemedText variant="small" numberOfLines={1} style={{ flex: 1 }}>
        {attachment.file_name}
      </ThemedText>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Post Card (read-only — no edit/delete)
// ---------------------------------------------------------------------------

function PostCard({ post }: { post: PostWithDetails }) {
  const typeColor = POST_TYPE_COLORS[post.type];

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.lg,
        gap: spacing.md,
      }}
    >
      {/* Header: author + type badge + time */}
      <View
        style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.primaryMuted,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ThemedText
            variant="small"
            style={{ color: colors.primary, fontWeight: "600" }}
          >
            {post.author?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
          </ThemedText>
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText variant="caption" style={{ fontWeight: "600" }}>
            {post.author?.full_name ?? "Unknown"}
          </ThemedText>
          <ThemedText variant="small" muted>
            {formatTime(post.created_at)}
          </ThemedText>
        </View>
        <View
          style={{
            backgroundColor: typeColor + "18",
            borderRadius: radii.pill,
            paddingHorizontal: spacing.sm,
            paddingVertical: 2,
          }}
        >
          <ThemedText
            variant="small"
            style={{ color: typeColor, fontWeight: "600" }}
          >
            {POST_TYPE_LABELS[post.type]}
          </ThemedText>
        </View>
      </View>

      {/* Content */}
      {post.content ? (
        <ThemedText variant="body">{post.content}</ThemedText>
      ) : null}

      {/* Attachments */}
      {post.attachments && post.attachments.length > 0 && (
        <View
          style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}
        >
          {post.attachments.map((att) => (
            <AttachmentThumbnail key={att.id} attachment={att} />
          ))}
        </View>
      )}

      {/* Quiz-link CTA */}
      {post.type === "quiz_link" && (
        <View
          style={{
            backgroundColor: POST_TYPE_COLORS.quiz_link + "10",
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: POST_TYPE_COLORS.quiz_link + "30",
            padding: spacing.md,
            gap: spacing.sm,
          }}
        >
          <ThemedText
            variant="caption"
            style={{
              color: POST_TYPE_COLORS.quiz_link,
              fontWeight: "600",
            }}
          >
            📝 Quiz Available
          </ThemedText>
          <ThemedText variant="small" muted>
            Check the Quizzes tab to take this quiz.
          </ThemedText>
          <Pressable
            onPress={() => {
              // Navigate to quizzes tab for this class
              router.push(Routes.studentClassQuizzes(post.class_id) as any);
            }}
            style={{
              backgroundColor: POST_TYPE_COLORS.quiz_link,
              borderRadius: radii.md,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.md,
              alignItems: "center",
              alignSelf: "flex-start",
            }}
          >
            <ThemedText
              variant="small"
              style={{ color: colors.white, fontWeight: "600" }}
            >
              View Quizzes
            </ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Class Feed Screen (student — read-only)
// ---------------------------------------------------------------------------

export default function StudentClassFeedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const classId = id ?? "";
  const accent = getAccent("student");
  const { classData, loading: classLoading } = useClass(classId);
  const { posts, loading, refreshing, refresh } = useClassFeed(classId);

  const renderPost = ({ item }: { item: PostWithDetails }) => (
    <PostCard post={item} />
  );

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
          No posts yet
        </ThemedText>
        <ThemedText muted style={{ textAlign: "center" }}>
          Your teacher hasn't posted anything yet.{"\n"}Check back later!
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
              {classLoading ? "Loading..." : (classData?.name ?? "Class Feed")}
            </ThemedText>
            {classData && (
              <ThemedText variant="small" muted>
                {classData.subject}
                {classData.section ? ` · ${classData.section}` : ""}
              </ThemedText>
            )}
          </View>
          {/* Navigation pills */}
          <Pressable
            onPress={() =>
              router.push(Routes.studentClassQuizzes(classId) as any)
            }
            style={{
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              borderRadius: radii.pill,
              backgroundColor: accent.accentSoft,
            }}
          >
            <ThemedText
              variant="small"
              style={{ color: accent.accentText, fontWeight: "600" }}
            >
              Quizzes
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => router.push(Routes.studentGrades as any)}
            style={{
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              borderRadius: radii.pill,
              backgroundColor: accent.accentSoft,
            }}
          >
            <ThemedText
              variant="small"
              style={{ color: accent.accentText, fontWeight: "600" }}
            >
              Grades
            </ThemedText>
          </Pressable>
        </View>

        {/* Feed */}
        {loading && posts.length === 0 ? (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <ActivityIndicator size="large" color={accent.accent} />
          </View>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={renderPost}
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
      </View>
    </Screen>
  );
}

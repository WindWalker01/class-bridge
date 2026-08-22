import { router, useLocalSearchParams } from "expo-router";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  View,
} from "react-native";

import {
  AnimatedListItem,
  Avatar,
  Badge,
  Card,
  EmptyState,
  FadeInView,
  Screen,
  ScreenHeader,
  SkeletonCard,
  ThemedText,
} from "@/components";
import { BookOpen, Clipboard, FileText, CheckSquare } from "lucide-react-native";
import { modeColor, radii, spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
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

// Static decorative colours for post type badges (not theme-dependent)
const POST_TYPE_COLORS: Record<PostType, string> = {
  announcement: "#6366f1", // indigo
  material: "#0ea5e9",    // sky
  quiz_link: "#f59e0b",   // amber
};

// ---------------------------------------------------------------------------
// Attachment Thumbnail
// ---------------------------------------------------------------------------

function AttachmentThumbnail({ attachment }: { attachment: Attachment }) {
  const { colors } = useTheme();
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
  const { colors, accent } = useTheme();

  return (
    <Card variant="flat">
      {/* Header: author + type badge + time */}
      <View
        style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}
      >
        <Avatar
          name={post.author?.full_name ?? "Unknown"}
          uri={post.author?.avatar_url}
          size={32}
        />
        <View style={{ flex: 1 }}>
          <ThemedText variant="caption" style={{ fontWeight: "600" }}>
            {post.author?.full_name ?? "Unknown"}
          </ThemedText>
          <ThemedText variant="small" muted>
            {formatTime(post.created_at)}
          </ThemedText>
        </View>
        <Badge
          label={POST_TYPE_LABELS[post.type]}
          tone={post.type === "announcement" ? "accent" : post.type === "material" ? "neutral" : "warning"}
          size="sm"
        />
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
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Class Feed Screen (student — read-only)
// ---------------------------------------------------------------------------

export default function StudentClassFeedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const classId = id ?? "";
  const { colors, accent } = useTheme();
  const { classData, loading: classLoading } = useClass(classId);
  const { posts, loading, refreshing, refresh } = useClassFeed(classId);

  const renderPost = ({ item }: { item: PostWithDetails }) => (
    <PostCard post={item} />
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <EmptyState
        icon={CheckSquare}
        title="No posts yet"
        message="Your teacher hasn't posted anything yet.\nCheck back later!"
      />
    );
  };

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <ScreenHeader
          title={classLoading ? "Loading..." : (classData?.name ?? "Class Feed")}
          subtitle={classData ? `${classData.subject}${classData.section ? ` · ${classData.section}` : ""}` : undefined}
          onBack={() => router.back()}
          rightAction={
            <View style={{ flexDirection: "row", gap: spacing.xs }}>
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
          }
        />

        {/* Feed */}
        {loading && posts.length === 0 ? (
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
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <AnimatedListItem index={index}>
                {renderPost({ item })}
              </AnimatedListItem>
            )}
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

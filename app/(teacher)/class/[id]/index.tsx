import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Pressable,
  RefreshControl,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  AnimatedListItem,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  FadeInView,
  IconButton,
  Screen,
  ScreenHeader,
  SkeletonCard,
  ThemedText,
  useToast,
} from "@/components";
import { radii, spacing, typography } from "@/constants/theme";
import { useAttachmentUrl } from "@/hooks/useAttachmentUrl";
import { useClass, useClassFeed, archiveClass } from "@/hooks/useClasses";
import { useTheme } from "@/hooks/useTheme";
import { openAttachment } from "@/lib/attachments";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import type { Attachment, PostType, PostWithDetails } from "@/types";
import { Archive, FileText, Paperclip } from "lucide-react-native";

// ---------------------------------------------------------------------------
// Helpers
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
  material: "#0ea5e9", // sky
  quiz_link: "#f59e0b", // amber
};

// ---------------------------------------------------------------------------
// Attachment Thumbnail
// ---------------------------------------------------------------------------

function AttachmentThumbnail({ attachment }: { attachment: Attachment }) {
  const { colors } = useTheme();
  const { show } = useToast();
  const [opening, setOpening] = useState(false);
  const isImage = isImageType(attachment.file_type);
  // Private bucket: resolve a short-lived signed URL for rendering.
  const { url: imageUrl } = useAttachmentUrl(isImage ? attachment : null);

  /** Download via signed URL and open the system share/viewer sheet. */
  const handleOpen = useCallback(async () => {
    if (opening) return;
    setOpening(true);
    try {
      await openAttachment(attachment);
    } catch (err) {
      console.error("[attachments] Failed to open:", err);
      show("Could not open attachment", { type: "error" });
    } finally {
      setOpening(false);
    }
  }, [attachment, opening, show]);

  if (isImage) {
    return (
      <Pressable
        onPress={handleOpen}
        disabled={opening}
        accessibilityLabel={`View ${attachment.file_name}`}
        style={{
          borderRadius: radii.sm,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surfaceMuted,
        }}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: 120, height: 90 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: 120,
              height: 90,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ActivityIndicator size="small" color={colors.textMuted} />
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handleOpen}
      disabled={opening}
      accessibilityLabel={`Download ${attachment.file_name}`}
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
        opacity: opening ? 0.6 : 1,
      }}
    >
      {opening ? (
        <ActivityIndicator size="small" color={colors.textMuted} />
      ) : (
        <IconButton icon={Paperclip} size={18} color={colors.textMuted} />
      )}
      <ThemedText variant="small" numberOfLines={1} style={{ flex: 1 }}>
        {attachment.file_name}
      </ThemedText>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Post Card
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
          tone={
            post.type === "announcement"
              ? "accent"
              : post.type === "material"
                ? "neutral"
                : "warning"
          }
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
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Composer
// ---------------------------------------------------------------------------

function Composer({
  classId,
  onPostCreated,
}: {
  classId: string;
  onPostCreated: () => void;
}) {
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<PostType>("announcement");
  const [attachments, setAttachments] = useState<
    { uri: string; name: string; type: string }[]
  >([]);
  const [posting, setPosting] = useState(false);

  const handlePickImage = async () => {
    try {
      const ImagePicker = require("expo-image-picker");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        const fileName = asset.uri.split("/").pop() ?? "image.jpg";
        const mimeType = asset.mimeType ?? "image/jpeg";
        setAttachments((prev) => [
          ...prev,
          { uri: asset.uri, name: fileName, type: mimeType },
        ]);
      }
    } catch {
      Alert.alert("Error", "Could not open image picker.");
    }
  };

  const handlePickDocument = async () => {
    try {
      const DocumentPicker = require("expo-document-picker");
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        setAttachments((prev) => [
          ...prev,
          {
            uri: asset.uri,
            name: asset.name,
            type: asset.mimeType ?? "application/octet-stream",
          },
        ]);
      }
    } catch {
      Alert.alert("Error", "Could not open document picker.");
    }
  };

  const handleAttach = () => {
    Alert.alert("Attach", "Choose attachment type", [
      { text: "Photo from Library", onPress: handlePickImage },
      { text: "Document", onPress: handlePickDocument },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handlePost = async () => {
    if (!content.trim() && attachments.length === 0) return;
    if (!user) return;
    setPosting(true);

    // 1. Insert the post
    const { data: postData, error: postError } = await supabase
      .from("posts")
      .insert({
        class_id: classId,
        author_id: user.id,
        type: postType,
        content: content.trim(),
      })
      .select("id")
      .single();

    if (postError || !postData) {
      Alert.alert("Error", "Failed to create post.");
      setPosting(false);
      return;
    }

    const postId = postData.id;

    // 2. Upload attachments
    if (attachments.length > 0) {
      const attachmentRows: {
        post_id: string;
        file_url: string;
        file_name: string;
        file_type: string;
      }[] = [];

      for (const att of attachments) {
        const path = `${classId}/${postId}/${att.name}`;
        console.log(
          "[composer] uploading:",
          path,
          "| user.id:",
          user.id,
          "| type:",
          att.type,
        );

        // Fetch the file as a blob
        const response = await fetch(att.uri);
        const blob = await response.blob();

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("class-attachments")
          .upload(path, blob, {
            contentType: att.type,
            upsert: false,
          });

        if (uploadError) {
          console.error("[composer] upload error:", uploadError);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("class-attachments")
          .getPublicUrl(path);

        attachmentRows.push({
          post_id: postId,
          file_url: urlData.publicUrl,
          file_name: att.name,
          file_type: att.type,
        });
      }

      if (attachmentRows.length > 0) {
        const { error: attError } = await supabase
          .from("attachments")
          .insert(attachmentRows);

        if (attError) {
          console.error("[composer] attachment insert error:", attError);
        }
      }
    }

    // 3. Reset & refresh
    setContent("");
    setAttachments([]);
    setPosting(false);
    onPostCreated();
  };

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.background,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        gap: spacing.sm,
      }}
    >
      {/* Post type selector */}
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        {(["announcement", "material", "quiz_link"] as PostType[]).map(
          (type) => (
            <Pressable
              key={type}
              onPress={() => setPostType(type)}
              style={{
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                borderRadius: radii.pill,
                backgroundColor:
                  postType === type
                    ? POST_TYPE_COLORS[type] + "20"
                    : "transparent",
                borderWidth: 1,
                borderColor:
                  postType === type ? POST_TYPE_COLORS[type] : colors.border,
              }}
            >
              <ThemedText
                variant="small"
                style={{
                  color:
                    postType === type
                      ? POST_TYPE_COLORS[type]
                      : colors.textMuted,
                  fontWeight: postType === type ? "600" : "400",
                }}
              >
                {POST_TYPE_LABELS[type]}
              </ThemedText>
            </Pressable>
          ),
        )}
      </View>

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <View
          style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}
        >
          {attachments.map((att, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.xs,
                backgroundColor: colors.surfaceMuted,
                borderRadius: radii.sm,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
              }}
            >
              <ThemedText
                variant="small"
                numberOfLines={1}
                style={{ maxWidth: 120 }}
              >
                {att.name}
              </ThemedText>
              <Pressable
                onPress={() =>
                  setAttachments((prev) => prev.filter((_, i) => i !== idx))
                }
              >
                <ThemedText variant="small" style={{ color: colors.danger }}>
                  ✕
                </ThemedText>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Input row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          gap: spacing.sm,
        }}
      >
        <TextInput
          placeholder="Write a post..."
          placeholderTextColor={colors.textSubtle}
          value={content}
          onChangeText={setContent}
          multiline
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radii.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            color: colors.text,
            fontSize: typography.body.fontSize,
            maxHeight: 100,
          }}
        />
        <Pressable
          onPress={handleAttach}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.surfaceMuted,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ThemedText style={{ fontSize: 20 }}>📎</ThemedText>
        </Pressable>
        <Button
          label="Post"
          loading={posting}
          onPress={handlePost}
          disabled={!content.trim() && attachments.length === 0}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Class Feed Screen
// ---------------------------------------------------------------------------

export default function ClassFeedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const classId = id ?? "";
  const { colors, accent } = useTheme();
  const insets = useSafeAreaInsets();
  const { classData, loading: classLoading } = useClass(classId);
  const { posts, loading, refreshing, refresh, setPosts } =
    useClassFeed(classId);
  const { show } = useToast();

  const handlePostCreated = useCallback(() => {
    void refresh();
  }, [refresh]);

  const handleArchive = useCallback(() => {
    Alert.alert(
      "Archive class",
      `Archive "${classData?.name ?? "this class"}"? Students will no longer be able to view or join it. You can restore it later.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: async () => {
            const { error } = await archiveClass(classId);
            if (error) {
              show(error.message || "Failed to archive class.", {
                type: "error",
              });
              return;
            }
            show("Class archived", { type: "success" });
            router.back();
          },
        },
      ],
    );
  }, [classId, classData?.name, show]);

  const renderPost = ({ item }: { item: PostWithDetails }) => (
    <PostCard post={item} />
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <EmptyState
        title="No posts yet"
        message="Use the composer below to share announcements, materials, or quiz links."
        icon={FileText}
      />
    );
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={insets.top}
      >
        {/* Header */}
        <ScreenHeader
          title={
            classLoading ? "Loading..." : (classData?.name ?? "Class Feed")
          }
          subtitle={
            classData
              ? `${classData.subject}${classData.section ? ` · ${classData.section}` : ""}`
              : undefined
          }
          onBack={() => router.back()}
          rightAction={
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
              <IconButton
                icon={Archive}
                onPress={handleArchive}
                color={colors.danger}
                size={20}
                accessibilityLabel="Archive class"
              />
              <Pressable
                onPress={() =>
                  router.push(`/(teacher)/class/${classId}/quizzes` as any)
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
                onPress={() =>
                  router.push(`/(teacher)/class/${classId}/gradebook` as any)
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
                  Grades
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() =>
                  router.push(
                    `/(teacher)/class/${classId}/grade-settings` as any,
                  )
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
                  Weights
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
              paddingBottom: spacing.md,
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
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* Composer */}
        <Composer classId={classId} onPostCreated={handlePostCreated} />
      </KeyboardAvoidingView>
    </Screen>
  );
}

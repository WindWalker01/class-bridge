import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  TextInput,
  View,
} from "react-native";

import { Button, Screen, ThemedText } from "@/components";
import {
  colors,
  getAccent,
  radii,
  spacing,
  typography,
} from "@/constants/theme";
import { useClass, useClassFeed } from "@/hooks/useClasses";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import type { Attachment, PostType, PostWithDetails } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
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
          // In a real app, open full-screen viewer
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
// Post Card
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
    </View>
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
  const accent = getAccent("teacher");
  const { classData, loading: classLoading } = useClass(classId);
  const { posts, loading, refreshing, refresh, setPosts } =
    useClassFeed(classId);

  const handlePostCreated = useCallback(() => {
    void refresh();
  }, [refresh]);

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
          Use the composer below to share announcements, materials, or quiz
          links.
        </ThemedText>
      </View>
    );
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
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

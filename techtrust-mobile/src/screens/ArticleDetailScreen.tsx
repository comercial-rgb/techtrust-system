/**
 * ArticleDetailScreen - Tela de detalhes do artigo
 * Exibe o conteúdo completo de um artigo
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface Article {
  id: string;
  title: string;
  summary?: string;
  content?: string;
  imageUrl?: string;
  slug: string;
  publishDate: string;
  author?: string;
}

export default function ArticleDetailScreen({ route, navigation }: any) {
  const article: Article = route.params?.article;
  const [imageError, setImageError] = useState(false);

  if (!article) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#9ca3af" />
          <Text style={styles.errorText}>Article not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${article.title}\n\n${article.summary || ''}\n\nRead more on TechTrust`,
        title: article.title,
      });
    } catch (error) {
      console.error('Error sharing article:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Article</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleShare}
        >
          <Ionicons name="share-outline" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Featured Image */}
        {article.imageUrl && !imageError ? (
          <Image
            source={{ uri: article.imageUrl }}
            style={styles.featuredImage}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[styles.featuredImage, styles.imagePlaceholder]}>
            <Ionicons name="newspaper-outline" size={64} color="#9ca3af" />
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {/* Meta Info */}
          <View style={styles.metaContainer}>
            <View style={styles.categoryBadge}>
              <Ionicons name="information-circle" size={14} color="#3b82f6" />
              <Text style={styles.categoryText}>Article</Text>
            </View>
            <Text style={styles.dateText}>{formatDate(article.publishDate)}</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{article.title}</Text>

          {/* Author */}
          {article.author && (
            <View style={styles.authorContainer}>
              <View style={styles.authorAvatar}>
                <Ionicons name="person" size={16} color="#6b7280" />
              </View>
              <Text style={styles.authorText}>By {article.author}</Text>
            </View>
          )}

          {/* Summary */}
          {article.summary && (
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryText}>{article.summary}</Text>
            </View>
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Article Content */}
          {article.content ? (
            <Text style={styles.bodyText}>{article.content}</Text>
          ) : (
            <View style={styles.noContentContainer}>
              <Ionicons name="document-text-outline" size={48} color="#9ca3af" />
              <Text style={styles.noContentText}>
                Full article content will be displayed here
              </Text>
            </View>
          )}

          {/* Tags or Categories could go here */}
          <View style={styles.tagsContainer}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>Automotive</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>Maintenance</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  featuredImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#f3f4f6',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#dbeafe',
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  dateText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 36,
    marginBottom: 16,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorText: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryContainer: {
    padding: 16,
    backgroundColor: '#f9fafb',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    borderRadius: 8,
    marginBottom: 20,
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 20,
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 28,
    color: '#374151',
    marginBottom: 24,
  },
  noContentContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noContentText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 20,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
  },
  backButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

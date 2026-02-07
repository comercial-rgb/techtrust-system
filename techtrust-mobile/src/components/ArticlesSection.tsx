/**
 * ArticlesSection - Seção de Artigos
 * Exibe artigos gerenciados pelo admin
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface Article {
  id: string;
  title: string;
  summary?: string;
  imageUrl?: string;
  slug: string;
  publishDate: string;
}

interface ArticlesSectionProps {
  articles: Article[];
  onArticlePress?: (article: Article) => void;
  showHeader?: boolean;
  loading?: boolean;
}

export default function ArticlesSection({
  articles,
  onArticlePress,
  showHeader = true,
  loading = false,
}: ArticlesSectionProps) {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const handleImageError = (articleId: string) => {
    setImageErrors(prev => ({ ...prev, [articleId]: true }));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
    });
  };

  const renderArticle = ({ item }: { item: Article }) => {
    const hasError = imageErrors[item.id];
    
    // Ensure imageUrl is absolute
    const imageUrl = item.imageUrl?.startsWith('http') 
      ? item.imageUrl 
      : `${process.env.EXPO_PUBLIC_API_URL || 'https://techtrust-api.onrender.com'}${item.imageUrl}`;

    return (
      <TouchableOpacity
        style={styles.articleCard}
        activeOpacity={0.8}
        onPress={() => onArticlePress?.(item)}
      >
        {item.imageUrl && !hasError ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.articleImage}
            resizeMode="cover"
            onError={() => handleImageError(item.id)}
          />
        ) : (
          <View style={[styles.articleImage, styles.imagePlaceholder]}>
            <Ionicons name="newspaper-outline" size={32} color="#9ca3af" />
          </View>
        )}
        
        <View style={styles.articleContent}>
          <View style={styles.articleHeader}>
            <View style={styles.categoryBadge}>
              <Ionicons name="information-circle" size={14} color="#3b82f6" />
              <Text style={styles.categoryText}>Article</Text>
            </View>
            <Text style={styles.dateText}>{formatDate(item.publishDate)}</Text>
          </View>
          
          <Text style={styles.articleTitle} numberOfLines={2}>
            {item.title}
          </Text>
          
          {item.summary && (
            <Text style={styles.articleSummary} numberOfLines={3}>
              {item.summary}
            </Text>
          )}
          
          <View style={styles.readMoreContainer}>
            <Text style={styles.readMoreText}>Read more</Text>
            <Ionicons name="arrow-forward" size={16} color="#3b82f6" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        {showHeader && (
          <View style={styles.header}>
            <Ionicons name="newspaper" size={24} color="#3b82f6" />
            <View style={styles.headerText}>
              <Text style={styles.title}>Latest Articles</Text>
              <Text style={styles.subtitle}>Tips & news</Text>
            </View>
          </View>
        )}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </View>
    );
  }

  if (articles.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {showHeader && (
        <View style={styles.header}>
          <Ionicons name="newspaper" size={24} color="#3b82f6" />
          <View style={styles.headerText}>
            <Text style={styles.title}>Latest Articles</Text>
            <Text style={styles.subtitle}>Tips & news</Text>
          </View>
          {articles.length > 3 && (
            <TouchableOpacity style={styles.viewAllBtn}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      <FlatList
        data={articles}
        renderItem={renderArticle}
        keyExtractor={item => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  viewAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#dbeafe',
    borderRadius: 8,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  listContainer: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  articleCard: {
    width: 280,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  articleImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#f3f4f6',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  articleContent: {
    padding: 14,
  },
  articleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#dbeafe',
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3b82f6',
  },
  dateText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 22,
  },
  articleSummary: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginTop: 8,
  },
  readMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
  },
  readMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
  },
});

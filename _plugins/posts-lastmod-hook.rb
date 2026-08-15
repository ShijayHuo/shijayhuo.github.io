#!/usr/bin/env ruby
#
# Check for changed posts

Jekyll::Hooks.register :site, :post_read do |site|
  site.posts.docs.each do |post|
    next if post.data['source_platform']

    commit_num = `git rev-list --count HEAD "#{ post.path }"`

    if commit_num.to_i > 1
      lastmod_date = `git log -1 --pretty="%ad" --date=iso "#{ post.path }"`
      post.data['last_modified_at'] = lastmod_date
    end
  end
end

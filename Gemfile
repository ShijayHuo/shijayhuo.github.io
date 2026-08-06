# frozen_string_literal: true

source "https://rubygems.org"

gem "jekyll-theme-chirpy", "~> 7.6"

# sass-embedded 1.98+ ships a macOS binary that requires macOS 14.
gem "sass-embedded", "~> 1.97.3"

gem "html-proofer", "~> 5.0", group: :test

platforms :windows, :jruby do
  gem "tzinfo", ">= 1", "< 3"
  gem "tzinfo-data"
end

gem "wdm", "~> 0.2.0", :platforms => [:windows]
gem 'jekyll-compose', group: [:jekyll_plugins]

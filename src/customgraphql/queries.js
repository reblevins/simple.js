export const getPostByLinkName = /* GraphQL */ `
  query GetPostByLinkName($linkName: String!) {
    getPostByLinkName(linkName: $linkName) {
      id
      title
      content
      linkName
      blogID
      blog {
        id
        name
        posts {
          nextToken
        }
        createdAt
        updatedAt
      }
      comments {
        items {
          id
          postID
          content
          createdAt
          updatedAt
        }
        nextToken
      }
      createdAt
      updatedAt
    }
  }
`;
